"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    name: String,
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    googleId: { type: String, unique: true, sparse: true },
    password: String,
    role: {
        type: String,
        enum: ["USER", "DRIVER", "ADMIN"],
        default: "USER",
    },
    profilePhoto: String,
    phone: String,
    address: String,
    addresses: [
        {
            label: { type: String, default: "Home" },
            address: { type: String, required: true },
        },
    ],
    walletBalance: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    totalRides: { type: Number, default: 0 },
    // Admin Control Fields
    isBlocked: { type: Boolean, default: false },
    isSuspicious: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    // General status for drivers (linked to vehicle approval)
    status: {
        type: String,
        enum: ["PENDING", "AWAITING_APPROVAL", "APPROVED", "REJECTED", "ACTIVE", "INACTIVE"],
        default: "ACTIVE",
    },
    resetPasswordOTP: String,
    resetPasswordExpires: Date,
    refreshToken: String, // Added for refresh token functionality
    license: String, // Driver License (Person specific)
    aadhaar: String, // Identity Doc (Person specific)
}, { timestamps: true });
userSchema.index({ role: 1, status: 1 });
exports.default = mongoose_1.default.model("User", userSchema);
