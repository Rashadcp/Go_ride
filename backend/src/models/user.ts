import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

export default mongoose.model("User", userSchema);
