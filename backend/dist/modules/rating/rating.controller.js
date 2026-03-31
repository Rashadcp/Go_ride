"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRatings = exports.createRating = void 0;
const rating_1 = __importDefault(require("../../models/rating"));
const ride_1 = __importDefault(require("../../models/ride"));
const user_1 = __importDefault(require("../../models/user"));
const createRating = async (req, res) => {
    try {
        let { rideId, rating, feedback, targetId } = req.body;
        console.log(`⭐ Processing rating for Ride: ${rideId}, Rating: ${rating}, Target: ${targetId}`);
        // 1. Resolve MongoDB _id and ensure we have a targetId (Driver)
        // Check both internal _id and public rideId
        const ride = await ride_1.default.findOne({
            $or: [
                { _id: (rideId && typeof rideId === 'string' && rideId.match(/^[0-9a-fA-F]{24}$/)) ? rideId : undefined },
                { rideId: rideId }
            ].filter(query => Object.values(query)[0] !== undefined)
        }).populate('driverId').populate('createdBy');
        if (!ride) {
            console.error(`❌ Rating Error: Ride not found for ID: ${rideId}. Available search params were: rideId or _id.`);
            return res.status(404).json({
                message: "Trip record not found. Unable to attach rating.",
                receivedId: rideId
            });
        }
        // Final resolution for targetId (Driver to be rated)
        // If passenger ratings driver, targetId is driverId.
        // If driver ratings passenger (not implemented but prepared), it would be different.
        const finalTargetId = targetId || ride.driverId?._id || ride.driverId || ride.createdBy?._id || ride.createdBy;
        if (!finalTargetId) {
            return res.status(400).json({
                message: "Cannot submit rating: Drive info is missing for this trip record."
            });
        }
        const newRating = new rating_1.default({
            rideId: ride._id,
            userId: req.user.id,
            rating,
            feedback,
            targetId: finalTargetId
        });
        await newRating.save();
        // 2. Recalculate Target User's (Driver) Average Rating
        if (targetId) {
            const ratings = await rating_1.default.find({ targetId });
            if (ratings.length > 0) {
                const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
                const averageRating = totalRating / ratings.length;
                // Update User model with new average
                await user_1.default.findByIdAndUpdate(targetId, {
                    rating: Number(averageRating.toFixed(1)),
                    totalReviews: ratings.length // Assuming a totalReviews field exists or can be used
                });
            }
        }
        res.status(201).json({ message: "Rating submitted successfully", rating: newRating });
    }
    catch (err) {
        console.error("Rating creation error:", err);
        res.status(500).json({ message: "Error submitting rating", error: err.message });
    }
};
exports.createRating = createRating;
const getRatings = async (req, res) => {
    try {
        const ratings = await rating_1.default.find({ targetId: req.user.id })
            .populate('userId', 'name profilePhoto')
            .sort({ createdAt: -1 });
        res.json(ratings);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching ratings" });
    }
};
exports.getRatings = getRatings;
