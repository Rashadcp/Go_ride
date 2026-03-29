import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    getUserRides,
    getActiveRide,
    updateRideStatus,
    cancelRide,
    rateRide,
    getActiveDiscounts,
    validatePromoCode
} from "../controllers/ride.controller";
import { createCarpool } from "../modules/carpool/carpool.controller";

const router = Router();

// All ride routes require authentication
router.use(protect);

// Get user's ride history
router.get("/history", getUserRides);

// Get active promotions
router.get("/promotions", getActiveDiscounts);

// Validate promo code
router.get("/promotions/validate/:code", validatePromoCode);

// Get active ride for user
router.get("/active", getActiveRide);

// Update ride status
router.put("/status", updateRideStatus);

// Create Carpool (Driver)
router.post("/create-pool", createCarpool);

// Cancel ride
router.post("/cancel", cancelRide);

// Apply promo code (at paying time)
router.post("/apply-promo", (req, res, next) => {
    const { applyPromoCode } = require("../controllers/ride.controller");
    applyPromoCode(req, res, next).catch(next);
});

export default router;