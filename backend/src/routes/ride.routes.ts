import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    getUserRides,
    getActiveRide,
    updateRideStatus,
    cancelRide,
} from "../controllers/ride.controller";
import { createCarpool } from "../modules/carpool/carpool.controller";

const router = Router();

// All ride routes require authentication
router.use(protect);

// Get user's ride history
router.get("/history", getUserRides);

// Get active ride for user
router.get("/active", getActiveRide);

// Update ride status
router.put("/status", updateRideStatus);

// Create Carpool (Driver)
router.post("/create-pool", createCarpool);

// Cancel ride
router.post("/cancel", cancelRide);

export default router;