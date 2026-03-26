import { Response } from "express";
import Rating from "../../models/rating";
import Ride from "../../models/ride";
import User from "../../models/user";

export const createRating = async (req: any, res: Response) => {
    try {
        let { rideId, rating, feedback, targetId } = req.body;
        
        // 1. Resolve MongoDB _id and ensure we have a targetId (Driver)
        const ride = await Ride.findOne({ 
            $or: [
                { _id: (rideId && rideId.match(/^[0-9a-fA-F]{24}$/)) ? rideId : null }, 
                { rideId: rideId }
            ] 
        }).populate('driverId').populate('createdBy');

        if (!ride) {
            console.error(`❌ Ride not found for rating: ${rideId}`);
            return res.status(404).json({ message: "Ride connection failed. Document not found." });
        }

        // Final resolution for targetId (Driver to be rated)
        const finalTargetId = targetId || ride.driverId?._id || ride.driverId || ride.createdBy?._id || ride.createdBy;

        if (!finalTargetId) {
            return res.status(400).json({ 
                message: "Cannot submit rating: Drive info is missing for this trip record." 
            });
        }

        const newRating = new Rating({
            rideId: ride._id,
            userId: req.user.id,
            rating,
            feedback,
            targetId: finalTargetId
        });

        await newRating.save();

        // 2. Recalculate Target User's (Driver) Average Rating
        if (targetId) {
            const ratings = await Rating.find({ targetId });
            if (ratings.length > 0) {
                const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
                const averageRating = totalRating / ratings.length;
                
                // Update User model with new average
                await User.findByIdAndUpdate(targetId, {
                    rating: Number(averageRating.toFixed(1)),
                    totalReviews: ratings.length // Assuming a totalReviews field exists or can be used
                });
            }
        }

        res.status(201).json({ message: "Rating submitted successfully", rating: newRating });
    } catch (err: any) {
        console.error("Rating creation error:", err);
        res.status(500).json({ message: "Error submitting rating", error: err.message });
    }
};

export const getRatings = async (req: any, res: Response) => {
    try {
        const ratings = await Rating.find({ targetId: req.user.id })
            .populate('userId', 'name profilePhoto')
            .sort({ createdAt: -1 });
        res.json(ratings);
    } catch (err: any) {
        res.status(500).json({ message: "Error fetching ratings" });
    }
};
