import { Response } from "express";
import Rating from "../../models/rating";
import Ride from "../../models/ride";
import User from "../../models/user";

export const createRating = async (req: any, res: Response) => {
    try {
        const { rideId, rating, feedback, targetId } = req.body;
        
        const newRating = new Rating({
            rideId,
            userId: req.user.id,
            rating,
            feedback,
            targetId
        });

        await newRating.save();

        // Optional: Trigger rating update in user model (driver performance)
        // This is a future enhancement noted in the blueprint

        res.status(201).json({ message: "Rating submitted successfully", rating: newRating });
    } catch (err: any) {
        res.status(500).json({ message: "Error submitting rating", error: err.message });
    }
};

export const getRatings = async (req: any, res: Response) => {
    try {
        const ratings = await Rating.find({ targetId: req.user.id }).sort({ createdAt: -1 });
        res.json(ratings);
    } catch (err: any) {
        res.status(500).json({ message: "Error fetching ratings" });
    }
};
