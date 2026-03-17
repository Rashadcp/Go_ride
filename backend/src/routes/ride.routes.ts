import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    getUserRides,
    getActiveRide,
    updateRideStatus,
    cancelRide,
} from "../controllers/ride.controller";

const router = Router();

// All ride routes require authentication
router.use(protect);

// Get user's ride history
router.get("/history", getUserRides);

// Get active ride for user
router.get("/active", getActiveRide);

// Update ride status
router.put("/status", updateRideStatus);

// Cancel ride
router.post("/cancel", cancelRide);

export default router;