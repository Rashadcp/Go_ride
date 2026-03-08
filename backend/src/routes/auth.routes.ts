import express from "express";
import { register, login, getMe, updateProfile, forgotPassword, resetPassword, changePassword, completeDriverOnboarding, getTransactions, getDashboardStats, clearTransactions, refreshToken, logout } from "../controllers/auth.controller";
import { upload } from "../middleware/upload.middleware";
import { protect } from "../middleware/auth.middleware";
import passport from "../config/passport";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post(
  "/register",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: "rc", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "vehiclePhoto", maxCount: 1 },
  ]),
  register
);

router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/me", protect, upload.single("profilePhoto"), updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/change-password", protect, changePassword);
router.get("/transactions", protect, getTransactions);
router.delete("/transactions", protect, clearTransactions);
router.get("/stats", protect, getDashboardStats);

// Google OAuth
router.get("/google", (req, res, next) => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const state = role === "DRIVER" || role === "USER" ? role : undefined;

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    state,
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login` }),
  async (req: any, res: any) => {
    try {
      const user = req.user as any;
      const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_ACCESS_SECRET || "access_secret",
        { expiresIn: "15m" }
      );
      const refreshTokenValue = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || "refresh_secret",
        { expiresIn: "7d" }
      );

      // Save refresh token to user
      user.refreshToken = refreshTokenValue;
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      console.log(`Google Login Success: ${user.email} (${user.role}), Syncing via callback`);

      return res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshTokenValue}`);
    } catch (err) {
      console.error("Google Auth Callback Error:", err);
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=auth_failed`);
    }
  }
);

// Driver onboarding (required docs + number plate)
router.put(
  "/driver/onboarding",
  protect,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: "rc", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "vehiclePhoto", maxCount: 1 },
  ]),
  completeDriverOnboarding
);

export default router;