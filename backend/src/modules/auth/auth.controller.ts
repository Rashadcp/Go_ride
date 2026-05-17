import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./user.model";
import Vehicle from "../vehicle/vehicle.model";
import Transaction from "../payment/transaction.model";
import { sendOTP } from "../../config/mail";
import { generateAccessToken, generateRefreshToken } from "../../common/utils/token";
import { createNotification, createNotificationsForRole } from "../notification/notification.controller";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../../config/s3";
import stream from "stream";

const throwHttpError = (res: Response, status: number, message: string): never => {
  res.status(status);
  throw new Error(message);
};

export const getProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
  const keyParam = req.params.key;
  const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;
  const bucket = process.env.AWS_BUCKET_NAME || "go-ride";

  let folder = "goride/profiles/";
  if (key.startsWith("vehiclePhotos") || key.startsWith("vehiclePhoto")) {
    folder = "goride/vehicles/";
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: `${folder}${key}`
    });

    const { Body, ContentType } = await s3.send(command);

    if (Body instanceof stream.Readable) {
      res.setHeader("Content-Type", ContentType || "image/jpeg");
      Body.pipe(res);
      return;
    }
  } catch (err: any) {
    console.warn("S3 proxy error:", err.message);
  }

  res.status(404).json({ message: "Image not found on S3" });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, confirmPassword, role, phone } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  if (password !== confirmPassword) {
    throwHttpError(res, 400, "Passwords do not match");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throwHttpError(res, 400, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : undefined,
    password: hashedPassword,
    role,
    status: role === "DRIVER" ? "PENDING" : "ACTIVE",
    profilePhoto: (req.files as any)?.profilePhoto?.[0]?.location || undefined,
  });

  await newUser.save();

  const accessToken = generateAccessToken(newUser);
  const refreshTokenValue = generateRefreshToken(newUser);

  newUser.refreshToken = refreshTokenValue;
  await newUser.save();

  await createNotification(
    newUser._id.toString(),
    "Welcome to Go Ride!",
    "We're glad to have you with us. Explore our services and book your first ride today!",
    "SYSTEM"
  );

  res.status(201).json({
    message: "User registered successfully",
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      profilePhoto: newUser.profilePhoto,
      status: newUser.status,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throwHttpError(res, 400, "This email is not registered. Please sign up to create an account.");
  }
  const userDoc = user as NonNullable<typeof user>;

  if (!userDoc.password) {
    throwHttpError(res, 400, "This account was created via Google. Please use 'Continue with Google' to login.");
  }

  if (role && userDoc.role !== role && userDoc.role !== "ADMIN") {
    throwHttpError(res, 400, `This account is not registered as a ${role}.`);
  }

  const isMatch = await bcrypt.compare(password, userDoc.password as string);
  if (!isMatch) {
    throwHttpError(res, 400, "Invalid credentials");
  }

  const accessToken = generateAccessToken(userDoc);
  const refreshToken = generateRefreshToken(userDoc);

  await User.updateOne(
    { _id: userDoc._id },
    { $set: { refreshToken } }
  );

  let vehicle = null;
  if (userDoc.role === "DRIVER") {
    vehicle = await Vehicle.findOne({ ownerId: userDoc._id });
  }

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: userDoc._id,
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      profilePhoto: userDoc.profilePhoto,
      status: userDoc.status,
      vehicleType: vehicle?.vehicleType,
      vehicleNumber: vehicle?.numberPlate,
      vehicleModel: vehicle?.vehicleModel
    },
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body?.refreshToken;
  if (!token) {
    throwHttpError(res, 401, "Refresh Token is required");
  }
  const refreshTokenValue = token as string;

  const user = await User.findOne({ refreshToken: refreshTokenValue });
  if (!user) {
    throwHttpError(res, 403, "Invalid Refresh Token");
  }

  const userDoc = user as NonNullable<typeof user>;
  try {
    jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET || "refresh_secret");
  } catch (_error) {
    await User.updateOne(
      { _id: userDoc._id },
      { $unset: { refreshToken: 1 } }
    );
    throwHttpError(res, 403, "Refresh token expired or invalid");
  }

  const accessToken = generateAccessToken(userDoc);
  const newRefreshToken = generateRefreshToken(userDoc);

  await User.updateOne(
    { _id: userDoc._id },
    { $set: { refreshToken: newRefreshToken } }
  );

  res.json({
    accessToken,
    refreshToken: newRefreshToken,
  });
});

export const logout = asyncHandler(async (req: any, res: Response) => {
  const refreshToken = req.body?.refreshToken;

  if (refreshToken) {
    const user = await User.findOne({ refreshToken });
    if (user) {
      await User.updateOne({ _id: user._id }, { $unset: { refreshToken: 1 } });
    }
  } else if (req.user?.id) {
    const user = await User.findById(req.user.id);
    if (user) {
      await User.updateOne({ _id: user._id }, { $unset: { refreshToken: 1 } });
    }
  }

  res.json({ message: "Logged out successfully" });
});

export const getMe = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    throwHttpError(res, 404, "User not found");
  }

  const userDoc = user as NonNullable<typeof user>;

  let vehicle = null;
  if (userDoc.role === "DRIVER") {
    vehicle = await Vehicle.findOne({ ownerId: userDoc._id });
  }

  const userObj = userDoc.toObject();
  res.json({
    ...userObj,
    id: userDoc._id,
    _id: userDoc._id,
    vehicleType: vehicle?.vehicleType,
    vehicleNumber: vehicle?.numberPlate,
    vehicleModel: vehicle?.vehicleModel,
    vehiclePhoto: vehicle?.vehiclePhotos?.[0] || null
  });
});

export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throwHttpError(res, 404, "User not found");
  }

  const userDoc = user as NonNullable<typeof user>;

  if (req.body?.name) userDoc.name = req.body.name;
  if (req.body?.phone) userDoc.phone = req.body.phone;
  if (req.body?.address) userDoc.address = req.body.address;
  if (req.body?.addresses) userDoc.addresses = req.body.addresses;

  if (req.body?.walletBalance !== undefined) {
    const oldBalance = userDoc.walletBalance || 0;
    const newBalance = Number(req.body.walletBalance);
    userDoc.walletBalance = newBalance;

    const diff = newBalance - oldBalance;
    if (diff !== 0) {
      await new Transaction({
        userId: userDoc._id,
        type: diff > 0 ? "CREDIT" : "DEBIT",
        amount: Math.abs(diff),
        description: diff > 0 ? "Balance Top-up" : "Wallet Payment",
        status: "SUCCESS"
      }).save();
    }
  }

  if ((req.file as any)?.location) {
    userDoc.profilePhoto = (req.file as any).location;
  }

  await userDoc.save();

  const safeUser = userDoc.toObject();
  delete (safeUser as any).password;
  res.json(safeUser);
});

export const getTransactions = asyncHandler(async (req: any, res: Response) => {
  const transactions = await Transaction.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(10);
  res.json(transactions);
});

export const getDashboardStats = asyncHandler(async (req: any, res: Response) => {
  const availableCars = await User.countDocuments({ role: "DRIVER", status: "APPROVED" });
  const user = await User.findById(req.user.id);

  res.json({
    availableCars: availableCars || 0,
    eta: availableCars > 0 ? "4 Min" : "N/A",
    rating: user?.rating || 5.0,
    totalRides: user?.totalRides || 0
  });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throwHttpError(res, 404, "This email address is not registered with us. Please check for typos or sign up.");
  }

  const userDoc = user as NonNullable<typeof user>;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  userDoc.resetPasswordOTP = otp;
  userDoc.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  await userDoc.save();

  const mailResult = await sendOTP(email, otp);
  if ((mailResult as any).success === false) {
    res.json({ message: "Note: Real email failed. OTP has been logged to the SERVER CONSOLE for security." });
    return;
  }

  res.json({ message: "OTP sent to email" });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({
    email: normalizedEmail,
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) {
    throwHttpError(res, 400, "Invalid or expired OTP");
  }

  const userDoc = user as NonNullable<typeof user>;

  userDoc.password = await bcrypt.hash(newPassword, 10);
  userDoc.resetPasswordOTP = undefined;
  userDoc.resetPasswordExpires = undefined;
  await userDoc.save();

  res.json({ message: "Password reset successful" });
});

export const changePassword = asyncHandler(async (req: any, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) {
    throwHttpError(res, 404, "User not found");
  }

  const userDoc = user as NonNullable<typeof user>;
  const isMatch = await bcrypt.compare(oldPassword, userDoc.password as string);
  if (!isMatch) {
    throwHttpError(res, 400, "Old password is incorrect");
  }

  userDoc.password = await bcrypt.hash(newPassword, 10);
  await userDoc.save();

  res.json({ message: "Password updated successfully" });
});

export const completeDriverOnboarding = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throwHttpError(res, 404, "User not found");
  }

  const userDoc = user as NonNullable<typeof user>;

  let files = req.files as any;
  if (Array.isArray(files)) {
    const filesDict: any = {};
    files.forEach((file: any) => {
      if (!filesDict[file.fieldname]) filesDict[file.fieldname] = [];
      filesDict[file.fieldname].push(file);
    });
    files = filesDict;
  }

  const { numberPlate, vehicleModel, vehicleType } = req.body;
  let vehicle = await (Vehicle as any).findOne({ ownerId: userDoc._id });

  if (!vehicle) {
      vehicle = new Vehicle({
      ownerId: userDoc._id,
      numberPlate,
      vehicleModel,
      vehicleType,
    });
  } else {
    vehicle.numberPlate = numberPlate || vehicle.numberPlate;
    vehicle.vehicleModel = vehicleModel || vehicle.vehicleModel;
    vehicle.vehicleType = vehicleType || vehicle.vehicleType;
  }

  if (files?.license?.[0]) userDoc.license = (files.license[0] as any).location;
  if (files?.aadhaar?.[0]) userDoc.aadhaar = (files.aadhaar[0] as any).location;
  if (files?.profilePhoto?.[0]) userDoc.profilePhoto = (files.profilePhoto[0] as any).location;
  if (files?.rc?.[0]) vehicle.rc = (files.rc[0] as any).location;
  if (files?.vehiclePhotos) {
    vehicle.vehiclePhotos = files.vehiclePhotos.map((file: any) => file.location);
  }

  const missing: string[] = [];
  if (!vehicle.numberPlate) missing.push("numberPlate");
  if (!vehicle.vehicleType) missing.push("vehicleType");
  if (!vehicle.rc) missing.push("rc");
  if (!vehicle.vehiclePhotos || vehicle.vehiclePhotos.length === 0) missing.push("vehiclePhotos");
  if (!userDoc.license) missing.push("license");
  if (!userDoc.aadhaar) missing.push("aadhaar");

  if (missing.length > 0) {
    res.status(400).json({
      message: "Driver documents and complete vehicle info are required",
      missing,
    });
    return;
  }

  try {
    await vehicle.save();
  } catch (saveErr: any) {
    if (saveErr.code === 11000) {
      res.status(400);
      throw new Error("This vehicle number plate is already registered. Please contact support if this is an error.");
    }
    throw saveErr;
  }

  userDoc.role = "DRIVER";
  userDoc.status = "AWAITING_APPROVAL";
  await userDoc.save();

  await createNotification(
    userDoc._id.toString(),
    "Onboarding Submitted",
    "Your driver documents have been submitted for review. We will notify you once you're approved!",
    "SYSTEM"
  );
  await createNotificationsForRole(
    "ADMIN",
    "New Driver Approval Request",
    `${userDoc.name || userDoc.email} submitted driver onboarding documents and is awaiting review.`,
    "SYSTEM"
  );

  res.json({
    message: "Onboarding documents submitted successfully. Pending approval.",
    user: {
      id: userDoc._id,
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      status: userDoc.status,
      vehicleNumber: vehicle.numberPlate,
      vehicleType: vehicle.vehicleType,
      vehicleModel: vehicle.vehicleModel
    },
    vehicle,
  });
});

export const clearTransactions = asyncHandler(async (req: any, res: Response) => {
  await Transaction.deleteMany({ userId: req.user.id });
  res.json({ message: "Transaction history cleared" });
});
