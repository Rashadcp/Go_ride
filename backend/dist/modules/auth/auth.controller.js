"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearTransactions = exports.completeDriverOnboarding = exports.changePassword = exports.resetPassword = exports.forgotPassword = exports.getDashboardStats = exports.getTransactions = exports.updateProfile = exports.getMe = exports.logout = exports.refreshToken = exports.login = exports.register = exports.getProfilePhoto = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../../models/user"));
const vehicle_1 = __importDefault(require("../../models/vehicle"));
const transaction_1 = __importDefault(require("../../models/transaction"));
const mail_1 = require("../../config/mail");
const token_1 = require("../../common/utils/token");
const notification_controller_1 = require("../notification/notification.controller");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_1 = require("../../config/s3");
const stream_1 = __importDefault(require("stream"));
const getProfilePhoto = async (req, res) => {
    try {
        const keyParam = req.params.key;
        const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;
        const bucket = process.env.AWS_BUCKET_NAME || "go-ride";
        // Attempt to determine folder based on file naming or just try both
        let folder = "goride/profiles/";
        if (key.startsWith('vehiclePhotos') || key.startsWith('vehiclePhoto')) {
            folder = "goride/vehicles/";
        }
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: `${folder}${key}`
        });
        const { Body, ContentType } = await s3_1.s3.send(command);
        if (Body instanceof stream_1.default.Readable) {
            res.setHeader("Content-Type", ContentType || "image/jpeg");
            Body.pipe(res);
        }
        else {
            res.status(404).json({ message: "File body is invalid" });
        }
    }
    catch (err) {
        console.warn("⚠️ S3 Proxy Error:", err.message);
        res.status(404).json({ message: "Image not found on S3" });
    }
};
exports.getProfilePhoto = getProfilePhoto;
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, role, phone } = req.body;
        const normalizedEmail = email.trim().toLowerCase();
        console.log(`🚀 Registration attempt: ${normalizedEmail} as ${role}`);
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        const existingUser = await user_1.default.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = new user_1.default({
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email: normalizedEmail,
            phone: phone ? phone.trim() : undefined,
            password: hashedPassword,
            role,
            status: role === "DRIVER" ? "PENDING" : "ACTIVE",
            profilePhoto: req.files?.profilePhoto?.[0]?.location || undefined,
        });
        await newUser.save();
        const accessToken = (0, token_1.generateAccessToken)(newUser);
        const refreshTokenValue = (0, token_1.generateRefreshToken)(newUser);
        newUser.refreshToken = refreshTokenValue;
        await newUser.save();
        await (0, notification_controller_1.createNotification)(newUser._id.toString(), "Welcome to Go Ride!", "We're glad to have you with us. Explore our services and book your first ride today!", "SYSTEM");
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
    }
    catch (err) {
        console.error("❌ Registration error:", err);
        res.status(500).json({
            message: "Server error during registration",
            error: err.message
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const normalizedEmail = email.trim().toLowerCase();
        console.log(`Login attempt: ${normalizedEmail} as ${role || 'any'}`);
        const user = await user_1.default.findOne({ email: normalizedEmail });
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
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });
        const accessToken = (0, token_1.generateAccessToken)(user);
        const refreshToken = (0, token_1.generateRefreshToken)(user);
        user.refreshToken = refreshToken;
        await user.save();
        let vehicle = null;
        if (user.role === "DRIVER") {
            vehicle = await vehicle_1.default.findOne({ ownerId: user._id });
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
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token)
            return res.status(401).json({ message: "Refresh Token is required" });
        const user = await user_1.default.findOne({ refreshToken: token });
        if (!user)
            return res.status(403).json({ message: "Invalid Refresh Token" });
        jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET || "refresh_secret");
        const accessToken = (0, token_1.generateAccessToken)(user);
        const newRefreshToken = (0, token_1.generateRefreshToken)(user);
        user.refreshToken = newRefreshToken;
        await user.save();
        res.json({
            accessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.refreshToken = refreshToken;
const logout = async (req, res) => {
    try {
        const user = await user_1.default.findById(req.user.id);
        if (user) {
            user.refreshToken = undefined;
            await user.save();
        }
        res.json({ message: "Logged out successfully" });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.logout = logout;
const getMe = async (req, res) => {
    try {
        const user = await user_1.default.findById(req.user.id).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        let vehicle = null;
        if (user.role === "DRIVER") {
            vehicle = await vehicle_1.default.findOne({ ownerId: user._id });
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
    }
    catch (err) {
        console.error("getMe error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        const user = await user_1.default.findById(req.user.id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (req.body?.name) {
            user.name = req.body.name;
        }
        if (req.body?.phone) {
            user.phone = req.body.phone;
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
                await new transaction_1.default({
                    userId: user._id,
                    type: diff > 0 ? "CREDIT" : "DEBIT",
                    amount: Math.abs(diff),
                    description: diff > 0 ? "Balance Top-up" : "Wallet Payment",
                    status: "SUCCESS"
                }).save();
            }
        }
        if (req.file?.location) {
            user.profilePhoto = req.file.location;
        }
        await user.save();
        const safeUser = user.toObject();
        delete safeUser.password;
        res.json(safeUser);
    }
    catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ message: "Error updating profile" });
    }
};
exports.updateProfile = updateProfile;
const getTransactions = async (req, res) => {
    try {
        const transactions = await transaction_1.default.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(transactions);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching transactions" });
    }
};
exports.getTransactions = getTransactions;
const getDashboardStats = async (req, res) => {
    try {
        const availableCars = await user_1.default.countDocuments({ role: "DRIVER", status: "APPROVED" });
        const user = await user_1.default.findById(req.user.id);
        res.json({
            availableCars: availableCars || 0,
            eta: availableCars > 0 ? "4 Min" : "N/A", // Simulation logic based on cars
            rating: user?.rating || 5.0,
            totalRides: user?.totalRides || 0
        });
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching dashboard stats" });
    }
};
exports.getDashboardStats = getDashboardStats;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase();
        const user = await user_1.default.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: "This email address is not registered with us. Please check for typos or sign up." });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();
        const mailResult = await (0, mail_1.sendOTP)(email, otp);
        if (mailResult.success === false) {
            return res.json({ message: "Note: Real email failed. OTP has been logged to the SERVER CONSOLE for security." });
        }
        res.json({ message: "OTP sent to email" });
    }
    catch (err) {
        console.error("Forgot password error details:", err);
        res.status(500).json({ message: "Internal server error: " + err.message });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const normalizedEmail = email.toLowerCase();
        const user = await user_1.default.findOne({
            email: normalizedEmail,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        user.password = await bcryptjs_1.default.hash(newPassword, 10);
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ message: "Password reset successful" });
    }
    catch (err) {
        res.status(500).json({ message: "Error resetting password" });
    }
};
exports.resetPassword = resetPassword;
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await user_1.default.findById(req.user.id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Old password is incorrect" });
        user.password = await bcryptjs_1.default.hash(newPassword, 10);
        await user.save();
        res.json({ message: "Password updated successfully" });
    }
    catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.changePassword = changePassword;
const completeDriverOnboarding = async (req, res) => {
    try {
        const user = await user_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let files = req.files;
        if (Array.isArray(files)) {
            // Convert array of files to dictionary for current logic
            const filesDict = {};
            files.forEach((f) => {
                if (!filesDict[f.fieldname])
                    filesDict[f.fieldname] = [];
                filesDict[f.fieldname].push(f);
            });
            files = filesDict;
        }
        const { numberPlate, vehicleModel, vehicleType } = req.body;
        // Check if vehicle already exists for this user
        let vehicle = await vehicle_1.default.findOne({ ownerId: user._id });
        if (!vehicle) {
            vehicle = new vehicle_1.default({
                ownerId: user._id,
                numberPlate,
                vehicleModel,
                vehicleType,
            });
        }
        else {
            vehicle.numberPlate = numberPlate || vehicle.numberPlate;
            vehicle.vehicleModel = vehicleModel || vehicle.vehicleModel;
            vehicle.vehicleType = vehicleType || vehicle.vehicleType;
        }
        if (files?.license?.[0])
            user.license = files.license[0].location;
        if (files?.aadhaar?.[0])
            user.aadhaar = files.aadhaar[0].location;
        if (files?.profilePhoto?.[0])
            user.profilePhoto = files.profilePhoto[0].location;
        if (files?.rc?.[0])
            vehicle.rc = files.rc[0].location;
        if (files?.vehiclePhotos) {
            vehicle.vehiclePhotos = files.vehiclePhotos.map((f) => f.location);
        }
        const missing = [];
        if (!vehicle.numberPlate)
            missing.push("numberPlate");
        if (!vehicle.vehicleType)
            missing.push("vehicleType");
        if (!vehicle.rc)
            missing.push("rc");
        if (!vehicle.vehiclePhotos || vehicle.vehiclePhotos.length === 0)
            missing.push("vehiclePhotos");
        if (!user.license)
            missing.push("license");
        if (!user.aadhaar)
            missing.push("aadhaar");
        if (missing.length > 0) {
            return res.status(400).json({
                message: "Driver documents and complete vehicle info are required",
                missing,
            });
        }
        try {
            await vehicle.save();
        }
        catch (saveErr) {
            if (saveErr.code === 11000) {
                return res.status(400).json({ message: "This vehicle number plate is already registered. Please contact support if this is an error." });
            }
            throw saveErr;
        }
        user.role = "DRIVER";
        user.status = "AWAITING_APPROVAL";
        await user.save();
        await (0, notification_controller_1.createNotification)(user._id.toString(), "Onboarding Submitted", "Your driver documents have been submitted for review. We will notify you once you're approved!", "SYSTEM");
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
    }
    catch (err) {
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
exports.completeDriverOnboarding = completeDriverOnboarding;
const clearTransactions = async (req, res) => {
    try {
        await transaction_1.default.deleteMany({ userId: req.user.id });
        res.json({ message: "Transaction history cleared" });
    }
    catch (err) {
        console.error("Clear transactions error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.clearTransactions = clearTransactions;
