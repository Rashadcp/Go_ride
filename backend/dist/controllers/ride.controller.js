"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPromoCode = exports.validatePromoCode = exports.getActiveDiscounts = exports.rateRide = exports.cancelRide = exports.updateRideStatus = exports.getActiveRide = exports.getUserRides = void 0;
const ride_1 = __importDefault(require("../models/ride"));
const user_1 = __importDefault(require("../models/user"));
const rating_1 = __importDefault(require("../models/rating"));
const discount_1 = __importDefault(require("../models/discount"));
// Get user's ride history
const getUserRides = async (req, res) => {
    try {
        const rides = await ride_1.default.find({
            $or: [
                { createdBy: req.user._id },
                { driverId: req.user._id },
                { "passengers.userId": req.user._id }
            ]
        })
            .populate('createdBy', 'name email phone profilePhoto')
            .populate('driverId', 'name email phone profilePhoto rating')
            .sort({ createdAt: -1 });
        // Add vehicle info for each ride if it has a driver
        const ridesWithVehicle = await Promise.all(rides.map(async (ride) => {
            const rideObj = ride.toObject();
            if (ride.driverId) {
                const Vehicle = require("../models/vehicle").default;
                const vehicle = await Vehicle.findOne({ ownerId: ride.driverId._id });
                if (vehicle) {
                    rideObj.driverId = {
                        ...rideObj.driverId,
                        vehicleNumber: vehicle.numberPlate,
                        vehicleType: vehicle.vehicleType,
                        vehicleModel: vehicle.vehicleModel
                    };
                }
            }
            return rideObj;
        }));
        res.json(ridesWithVehicle);
    }
    catch (err) {
        console.error("Get rides error:", err);
        res.status(500).json({ message: "Error fetching rides" });
    }
};
exports.getUserRides = getUserRides;
// Get active ride for user
const getActiveRide = async (req, res) => {
    try {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const ride = await ride_1.default.findOne({
            $or: [
                { createdBy: req.user._id, status: { $in: ["REQUESTED", "SEARCHING", "ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL"] } },
                { driverId: req.user._id, status: { $in: ["ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL"] } },
                { "passengers.userId": req.user._id, status: { $in: ["ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL"] } }
            ],
            createdAt: { $gte: twelveHoursAgo }
        })
            .populate('createdBy', 'name email phone profilePhoto')
            .populate('driverId', 'name email phone profilePhoto');
        if (ride) {
            const rideObj = ride.toObject();
            if (ride.driverId) {
                const Vehicle = require("../models/vehicle").default;
                const vehicle = await Vehicle.findOne({ ownerId: ride.driverId._id });
                if (vehicle) {
                    rideObj.driverId = {
                        ...rideObj.driverId,
                        vehicleNumber: vehicle.numberPlate,
                        vehicleType: vehicle.vehicleType,
                        vehicleModel: vehicle.vehicleModel
                    };
                }
            }
            return res.json(rideObj);
        }
        res.json(null);
    }
    catch (err) {
        console.error("Get active ride error:", err);
        res.status(500).json({ message: "Error fetching active ride" });
    }
};
exports.getActiveRide = getActiveRide;
// Update ride status
const updateRideStatus = async (req, res) => {
    try {
        const { rideId, status, location } = req.body;
        const ride = await ride_1.default.findOne({ rideId });
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }
        // Check permissions
        if (req.user.role === "DRIVER" && ride.driverId?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to update this ride" });
        }
        if (req.user.role === "USER" && ride.createdBy?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to update this ride" });
        }
        ride.status = status;
        // Set timestamps based on status
        if (status === "ACCEPTED")
            ride.acceptedAt = new Date();
        if (status === "STARTED")
            ride.startedAt = new Date();
        if (status === "COMPLETED")
            ride.completedAt = new Date();
        if (status === "CANCELLED")
            ride.cancelledAt = new Date();
        // Update driver location if provided
        if (location) {
            ride.driverLocation = location;
        }
        await ride.save();
        res.json({ message: "Ride status updated", ride });
    }
    catch (err) {
        console.error("Update ride status error:", err);
        res.status(500).json({ message: "Error updating ride status" });
    }
};
exports.updateRideStatus = updateRideStatus;
// Cancel ride
const cancelRide = async (req, res) => {
    try {
        const { rideId } = req.body;
        const ride = await ride_1.default.findOne({ rideId });
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }
        // Check permissions
        if (req.user.role === "DRIVER" && ride.driverId?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to cancel this ride" });
        }
        if (req.user.role === "USER" && ride.createdBy?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to cancel this ride" });
        }
        ride.status = "CANCELLED";
        ride.cancelledAt = new Date();
        await ride.save();
        res.json({ message: "Ride cancelled successfully" });
    }
    catch (err) {
        console.error("Cancel ride error:", err);
        res.status(500).json({ message: "Error cancelling ride" });
    }
};
exports.cancelRide = cancelRide;
// Rate ride
const rateRide = async (req, res) => {
    try {
        const { rideId, targetId, rating, feedback } = req.body;
        // Basic validation
        if (!rideId || !targetId || !rating) {
            return res.status(400).json({ message: "Missing required rating fields" });
        }
        // Save rating record
        const newRating = new rating_1.default({
            rideId,
            userId: req.user.id,
            targetId,
            rating: Number(rating),
            feedback: feedback || ""
        });
        await newRating.save();
        // Update target's average rating (the person being rated)
        const user = await user_1.default.findById(targetId);
        if (user) {
            // Recalculate average rating using the database truth
            const ratings = await rating_1.default.find({ targetId });
            const totalScore = ratings.reduce((acc, curr) => acc + curr.rating, 0);
            const avgRating = totalScore / ratings.length;
            user.rating = Math.round(avgRating * 10) / 10;
            // totalRides should represent actual trips, not just ratings counts, 
            // but for simple apps we often count these interchangeably.
            await user.save();
        }
        res.json({ message: "Thank you for your feedback!", avgRating: user?.rating });
    }
    catch (err) {
        console.error("Rate ride error:", err);
        res.status(500).json({ message: "Error saving rating" });
    }
};
exports.rateRide = rateRide;
// Get active and public discounts for all users
const getActiveDiscounts = async (req, res) => {
    try {
        const discounts = await discount_1.default.find({
            active: true,
            isPublic: true,
            expiryDate: { $gt: new Date() }
        }).sort({ createdAt: -1 });
        res.json(discounts);
    }
    catch (err) {
        console.error("Get discounts error:", err);
        res.status(500).json({ message: "Error fetching promotions" });
    }
};
exports.getActiveDiscounts = getActiveDiscounts;
// Validate specific promo code (pre-ride)
const validatePromoCode = async (req, res) => {
    try {
        const { code } = req.params;
        const discount = await discount_1.default.findOne({
            code: { $regex: new RegExp(`^${code}$`, 'i') },
            active: true,
            expiryDate: { $gt: new Date() }
        });
        if (!discount)
            return res.status(404).json({ message: "Invalid or expired promo code" });
        if (discount.currentUsage >= discount.maxUsage)
            return res.status(400).json({ message: "Promo limit reached" });
        res.json(discount);
    }
    catch (err) {
        console.error("Validate promo error:", err);
        res.status(500).json({ message: "Error validating promo code" });
    }
};
exports.validatePromoCode = validatePromoCode;
// Apply promo code to an existing ride (at paying time)
const applyPromoCode = async (req, res) => {
    try {
        const { rideId, code } = req.body;
        const ride = await ride_1.default.findOne({ rideId });
        if (!ride)
            return res.status(404).json({ message: "Ride not found" });
        if (ride.promoCode)
            return res.status(400).json({ message: "A promo code is already applied to this ride" });
        const discount = await discount_1.default.findOne({
            code: { $regex: new RegExp(`^${code}$`, 'i') },
            active: true,
            expiryDate: { $gt: new Date() }
        });
        if (!discount) {
            return res.status(400).json({ message: "Invalid or expired promo code" });
        }
        if (discount.currentUsage >= discount.maxUsage) {
            return res.status(400).json({ message: "Promo code limit reached" });
        }
        // Apply discount to price
        let newPrice = ride.price;
        if (discount.type === "PERCENTAGE") {
            newPrice = ride.price * (1 - discount.value / 100);
        }
        else if (discount.type === "FLAT") {
            newPrice = Math.max(0, ride.price - discount.value);
        }
        ride.price = Math.round(newPrice);
        ride.promoCode = discount.code;
        ride.discountId = discount._id;
        await ride.save();
        // Increment usage in background
        discount_1.default.findByIdAndUpdate(discount._id, { $inc: { currentUsage: 1 } }).catch(console.error);
        res.json({
            message: "Promo code applied successfully",
            price: ride.price,
            discountValue: discount.value,
            discountType: discount.type
        });
    }
    catch (err) {
        console.error("Apply promo error:", err);
        res.status(500).json({ message: "Error applying promo code" });
    }
};
exports.applyPromoCode = applyPromoCode;
