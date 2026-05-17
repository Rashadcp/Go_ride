import { Response } from "express";
import asyncHandler from "express-async-handler";
import Rating from "./rating.model";
import Ride from "../ride/ride.model";
import User from "../auth/user.model";

export const createRating = asyncHandler(async (req: any, res: Response) => {
    const { rideId, rating, feedback, targetId } = req.body;
    console.log(`Processing rating for Ride: ${rideId}, Rating: ${rating}, Target: ${targetId}`);
    
    const ride = await Ride.findOne({ 
        $or: [
            { _id: (rideId && typeof rideId === "string" && rideId.match(/^[0-9a-fA-F]{24}$/)) ? rideId : undefined }, 
            { rideId }
        ].filter(query => Object.values(query)[0] !== undefined)
    }).populate("driverId").populate("createdBy");

    if (!ride) {
        console.error(`Rating Error: Ride not found for ID: ${rideId}.`);
        res.status(404);
        throw new Error("Trip record not found. Unable to attach rating.");
    }

    const finalTargetId = targetId || ride.driverId?._id || ride.driverId || ride.createdBy?._id || ride.createdBy;

    if (!finalTargetId) {
        res.status(400);
        throw new Error("Cannot submit rating: Drive info is missing for this trip record.");
    }

    const newRating = new Rating({
        rideId: ride._id,
        userId: req.user.id,
        rating,
        feedback,
        targetId: finalTargetId
    });

    await newRating.save();

    if (targetId) {
        const ratings = await Rating.find({ targetId });
        if (ratings.length > 0) {
            const totalRating = ratings.reduce((sum, current) => sum + current.rating, 0);
            const averageRating = totalRating / ratings.length;

            await User.findByIdAndUpdate(targetId, {
                rating: Number(averageRating.toFixed(1)),
                totalReviews: ratings.length
            });
        }
    }

    res.status(201).json({ message: "Rating submitted successfully", rating: newRating });
});

export const getRatings = asyncHandler(async (req: any, res: Response) => {
    const ratings = await Rating.find({ targetId: req.user.id })
        .populate("userId", "name profilePhoto")
        .sort({ createdAt: -1 });
    res.json(ratings);
});
