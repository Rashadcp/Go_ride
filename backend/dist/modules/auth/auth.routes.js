"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_controller_1 = require("./auth.controller");
const upload_middleware_1 = require("../../common/middleware/upload.middleware");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const passport_1 = __importDefault(require("../../config/passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
router.post("/register", upload_middleware_1.upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: "rc", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "vehiclePhotos", maxCount: 5 },
]), auth_controller_1.register);
router.post("/login", auth_controller_1.login);
router.post("/refresh-token", auth_controller_1.refreshToken);
router.post("/logout", auth_middleware_1.protect, auth_controller_1.logout);
router.get("/me", auth_middleware_1.protect, auth_controller_1.getMe);
router.get("/profile-photo/:key", auth_controller_1.getProfilePhoto);
router.put("/me", auth_middleware_1.protect, upload_middleware_1.upload.single("profilePhoto"), auth_controller_1.updateProfile);
router.post("/forgot-password", auth_controller_1.forgotPassword);
router.post("/reset-password", auth_controller_1.resetPassword);
router.put("/change-password", auth_middleware_1.protect, auth_controller_1.changePassword);
router.get("/transactions", auth_middleware_1.protect, auth_controller_1.getTransactions);
router.delete("/transactions", auth_middleware_1.protect, auth_controller_1.clearTransactions);
router.get("/stats", auth_middleware_1.protect, auth_controller_1.getDashboardStats);
// Google OAuth
router.get("/google", (req, res, next) => {
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const state = role === "DRIVER" || role === "USER" ? role : undefined;
    return passport_1.default.authenticate("google", {
        scope: ["profile", "email"],
        state,
    })(req, res, next);
});
router.get("/google/callback", passport_1.default.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login` }), async (req, res) => {
    try {
        const user = req.user;
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET || "access_secret", { expiresIn: "15m" });
        const refreshTokenValue = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || "refresh_secret", { expiresIn: "7d" });
        // Save refresh token to user
        user.refreshToken = refreshTokenValue;
        await user.save();
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        console.log(`Google Login Success: ${user.email} (${user.role}), Syncing via callback`);
        return res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshTokenValue}`);
    }
    catch (err) {
        console.error("Google Auth Callback Error:", err);
        return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=auth_failed`);
    }
});
// Driver onboarding (required docs + number plate)
router.put("/driver/onboarding", auth_middleware_1.protect, (req, res, next) => {
    upload_middleware_1.upload.fields([
        { name: "profilePhoto", maxCount: 1 },
        { name: "license", maxCount: 1 },
        { name: "rc", maxCount: 1 },
        { name: "aadhaar", maxCount: 1 },
        { name: "vehiclePhotos", maxCount: 10 },
    ])(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            console.error("Multer error in onboarding:", err);
            return res.status(400).json({ message: `Upload error: ${err.message}`, field: err.field });
        }
        else if (err) {
            console.error("Unknown upload error:", err);
            return res.status(500).json({ message: "Unknown upload error", error: err.message });
        }
        next();
    });
}, auth_controller_1.completeDriverOnboarding);
exports.default = router;
