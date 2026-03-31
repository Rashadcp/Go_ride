"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const ride_controller_1 = require("./ride.controller");
const carpool_controller_1 = require("../carpool/carpool.controller");
const router = (0, express_1.Router)();
// All ride routes require authentication
router.use(auth_middleware_1.protect);
// Get user's ride history
router.get("/history", ride_controller_1.getUserRides);
// Get active promotions
router.get("/promotions", ride_controller_1.getActiveDiscounts);
// Validate promo code
router.get("/promotions/validate/:code", ride_controller_1.validatePromoCode);
// Get active ride for user
router.get("/active", ride_controller_1.getActiveRide);
// Update ride status
router.put("/status", ride_controller_1.updateRideStatus);
// Create Carpool (Driver)
router.post("/create-pool", carpool_controller_1.createCarpool);
// Cancel ride
router.post("/cancel", ride_controller_1.cancelRide);
// Rate a ride
router.post("/rate", ride_controller_1.rateRide);
// Apply promo code (at paying time)
router.post("/apply-promo", ride_controller_1.applyPromoCode);
exports.default = router;
