import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user";
import Vehicle from "../models/vehicle";
import Transaction from "../models/transaction";
import { sendOTP } from "../config/mail";
import { generateAccessToken, generateRefreshToken } from "../utils/token";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3";
import stream from "stream";

export const getProfilePhoto = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const bucket = process.env.AWS_BUCKET_NAME || "go-ride";
    
    // Attempt to determine folder based on file naming or just try both
    let folder = "goride/profiles/";
    if (key.startsWith('vehiclePhotos') || key.startsWith('vehiclePhoto')) {
        folder = "goride/vehicles/";
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: `${folder}${key}`
    });

    const { Body, ContentType } = await s3.send(command);

    if (Body instanceof stream.Readable) {
      res.setHeader("Content-Type", ContentType || "image/jpeg");
      Body.pipe(res);
    } else {
      res.status(404).json({ message: "File body is invalid" });
    }
  } catch (err: any) {
    console.warn("⚠️ S3 Proxy Error:", err.message);
    res.status(404).json({ message: "Image not found on S3" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`🚀 Registration attempt: ${normalizedEmail} as ${role}`);

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email: normalizedEmail,
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
  } catch (err: any) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ 
      message: "Server error during registration", 
      error: err.message
    });
  }
};



export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    console.log(`Login attempt: ${normalizedEmail} as ${role || 'any'}`);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log(`Login failed: User not registered - ${normalizedEmail}`);
      return res.status(400).json({
        message: "This email is not registered. Please sign up to create an account."
      });
    }

    if (!user.password) {
      console.log(`Login failed: Social-only account attempted password login - ${normalizedEmail}`);
      return res.status(400).json({
        message: "This account was created via Google. Please use 'Continue with Google' to login."
      });
    }

    // Role check: if role is provided (e.g. from social auth), verify it matches
    // Otherwise, let the user login and the frontend will handle redirection based on their actual role
    if (role && user.role !== role && user.role !== "ADMIN") {
      console.log(`Role mismatch during social/forced login: Expected ${role}, got ${user.role}`);
      return res.status(400).json({
        message: `This account is not registered as a ${role}.`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    let vehicle = null;
    if (user.role === "DRIVER") {
      vehicle = await Vehicle.findOne({ ownerId: user._id });
    }

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        status: user.status,
        vehicleType: vehicle?.vehicleType,
        vehicleNumber: vehicle?.numberPlate,
        vehicleModel: vehicle?.vehicleModel
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: "Refresh Token is required" });

    const user = await User.findOne({ refreshToken: token });
    if (!user) return res.status(403).json({ message: "Invalid Refresh Token" });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET || "refresh_secret", (err: any, decoded: any) => {
      if (err) return res.status(403).json({ message: "Invalid Refresh Token" });

      const accessToken = generateAccessToken(user);
      res.json({ accessToken });
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


export const getMe = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    let vehicle = null;
    if (user.role === "DRIVER") {
      vehicle = await Vehicle.findOne({ ownerId: user._id });
    }
    
    const userObj = user.toObject();
    res.json({
        ...userObj,
        id: user._id,
        _id: user._id,
        vehicleType: vehicle?.vehicleType,
        vehicleNumber: vehicle?.numberPlate,
        vehicleModel: vehicle?.vehicleModel,
        vehiclePhoto: vehicle?.vehiclePhotos?.[0] || null
    });
} catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: "Server error" });
}
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body?.name) {
      user.name = req.body.name;
    }
    if (req.body?.address) {
      user.address = req.body.address;
    }
    if (req.body?.addresses) {
      user.addresses = req.body.addresses;
    }
    if (req.body?.walletBalance !== undefined) {
      const oldBalance = user.walletBalance || 0;
      const newBalance = Number(req.body.walletBalance);
      user.walletBalance = newBalance;

      // Log transaction
      const diff = newBalance - oldBalance;
      if (diff !== 0) {
        await new Transaction({
          userId: user._id,
          type: diff > 0 ? "CREDIT" : "DEBIT",
          amount: Math.abs(diff),
          description: diff > 0 ? "Balance Top-up" : "Wallet Payment",
          status: "SUCCESS"
        }).save();
      }
    }
    if ((req.file as any)?.location) {
      user.profilePhoto = (req.file as any).location;
    }

    await user.save();

    const safeUser = user.toObject();
    delete (safeUser as any).password;
    res.json(safeUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Error updating profile" });
  }
};

export const getTransactions = async (req: any, res: Response) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: "Error fetching transactions" });
  }
};

export const getDashboardStats = async (req: any, res: Response) => {
  try {
    const availableCars = await User.countDocuments({ role: "DRIVER", driverStatus: "APPROVED" });
    const user = await User.findById(req.user.id);

    res.json({
      availableCars: availableCars || 0,
      eta: availableCars > 0 ? "4 Min" : "N/A", // Simulation logic based on cars
      rating: user?.rating || 5.0,
      totalRides: user?.totalRides || 0
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();
    console.log("Forgot password request for:", normalizedEmail);

    const user = await User.findOne({ email: normalizedEmail });
    console.log("User found:", !!user);

    if (!user) {
      console.log(`❌ Forgot password failed: Email not found - ${normalizedEmail}`);
      return res.status(404).json({ message: "This email address is not registered with us. Please check for typos or sign up." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp);

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log("Saving user with OTP...");
    await user.save();
    console.log("User saved successfully");

    console.log("Calling sendOTP...");
    const mailResult = await sendOTP(email, otp);
    console.log("sendOTP completed:", (mailResult as any).success !== false ? "SUCCESS" : "FAILED (Landed in Console)");

    if ((mailResult as any).success === false) {
      return res.json({ message: "Note: Real email failed. OTP has been logged to the SERVER CONSOLE for security." });
    }

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("Forgot password error details:", err);
    res.status(500).json({ message: "Internal server error: " + (err as Error).message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password as string);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const completeDriverOnboarding = async (req: any, res: Response) => {
  try {
    console.log("🏁 Starting Complete Driver Onboarding for User:", req.user?.id);
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("❌ User not found in onboarding:", req.user?.id);
      return res.status(404).json({ message: "User not found" });
    }

    let files = req.files as any;
    if (Array.isArray(files)) {
        // Convert array of files to dictionary for current logic
        const filesDict: any = {};
        files.forEach((f: any) => {
            if (!filesDict[f.fieldname]) filesDict[f.fieldname] = [];
            filesDict[f.fieldname].push(f);
        });
        files = filesDict;
    }

    const { numberPlate, vehicleModel, vehicleType } = req.body;
    console.log("📦 Onboarding Body:", { numberPlate, vehicleModel, vehicleType });
    console.log("📁 Uploaded Files:", Object.keys(files || {}));

    // Check if vehicle already exists for this user
    let vehicle = await (Vehicle as any).findOne({ ownerId: user._id });
    console.log("🚗 Existing Vehicle Found:", !!vehicle);

    if (!vehicle) {
      vehicle = new Vehicle({
        ownerId: user._id,
        numberPlate,
        vehicleModel,
        vehicleType,
      });
    } else {
      vehicle.numberPlate = numberPlate || vehicle.numberPlate;
      vehicle.vehicleModel = vehicleModel || vehicle.vehicleModel;
      vehicle.vehicleType = vehicleType || vehicle.vehicleType;
    }

    if (files?.license?.[0]) user.license = (files.license[0] as any).location;
    if (files?.aadhaar?.[0]) user.aadhaar = (files.aadhaar[0] as any).location;
    if (files?.profilePhoto?.[0]) user.profilePhoto = (files.profilePhoto[0] as any).location;

    if (files?.rc?.[0]) vehicle.rc = (files.rc[0] as any).location;

    if (files?.vehiclePhotos) {
      vehicle.vehiclePhotos = files.vehiclePhotos.map((f: any) => f.location);
    }

    const missing: string[] = [];
    if (!vehicle.numberPlate) missing.push("numberPlate");
    if (!vehicle.vehicleType) missing.push("vehicleType");
    if (!vehicle.rc) missing.push("rc");
    if (!vehicle.vehiclePhotos || vehicle.vehiclePhotos.length === 0) missing.push("vehiclePhotos");
    if (!user.license) missing.push("license");
    if (!user.aadhaar) missing.push("aadhaar");

    if (missing.length > 0) {
      console.log("❌ Missing fields in onboarding:", missing);
      return res.status(400).json({
        message: "Driver documents and complete vehicle info are required",
        missing,
      });
    }

    console.log("💾 Saving vehicle info...");
    try {
      await vehicle.save();
      console.log("✅ Vehicle saved.");
    } catch (saveErr: any) {
      if (saveErr.code === 11000) {
        console.log("❌ Number plate already exists:", numberPlate);
        return res.status(400).json({ message: "This vehicle number plate is already registered. Please contact support if this is an error." });
      }
      throw saveErr;
    }

    user.role = "DRIVER";
    user.status = "AWAITING_APPROVAL";
    console.log("💾 Saving user status...");
    await user.save();
    console.log("✅ User status updated.");

    res.json({
      message: "Onboarding documents submitted successfully. Pending approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        vehicleNumber: vehicle.numberPlate,
        vehicleType: vehicle.vehicleType,
        vehicleModel: vehicle.vehicleModel
      },
      vehicle,
    });
    } catch (err: any) {
        console.error("❌ CRITICAL Driver Onboarding Error:", {
            error: err,
            body: req.body,
            files: req.files ? Object.keys(req.files) : 'NONE',
            userId: req.user?.id
        });
        res.status(500).json({
            message: "Internal server error during onboarding",
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};


export const clearTransactions = async (req: any, res: Response) => {
  try {
    await Transaction.deleteMany({ userId: req.user.id });
    res.json({ message: "Transaction history cleared" });
  } catch (err) {
    console.error("Clear transactions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};