import express from "express";
import { getPendingDrivers, approveDriver, getAllDrivers, getDashboardStats, deleteDriver } from "../controllers/admin.controller";
import { protect, adminProtect } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/stats", protect, adminProtect, getDashboardStats);
router.get("/drivers", protect, adminProtect, getAllDrivers);
router.get("/pending-drivers", protect, adminProtect, getPendingDrivers);
router.put("/approve-driver/:vehicleId", protect, adminProtect, approveDriver);
router.delete("/driver/:id", protect, adminProtect, deleteDriver);

export default router;
