import { Response } from "express";
import Ride from "../models/ride";
import User from "../models/user";
import Rating from "../models/rating";

// Get user's ride history
export const getUserRides = async (req: any, res: Response) => {
    try {
        const rides = await Ride.find({
            $or: [
                { createdBy: req.user.id },
                { driverId: req.user.id }
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
                const vehicle = await Vehicle.findOne({ ownerId: (ride.driverId as any)._id });
                if (vehicle) {
                    rideObj.driverId = {
                        ...(rideObj.driverId as any),
                        vehicleNumber: vehicle.numberPlate,
                        vehicleType: vehicle.vehicleType,
                        vehicleModel: vehicle.vehicleModel
                    };
                }
            }
            return rideObj;
        }));

        res.json(ridesWithVehicle);
    } catch (err: any) {
        console.error("Get rides error:", err);
        res.status(500).json({ message: "Error fetching rides" });
    }
};

// Get active ride for user
export const getActiveRide = async (req: any, res: Response) => {
    try {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const ride = await Ride.findOne({
            $or: [
                { createdBy: req.user.id, status: { $in: ["REQUESTED", "SEARCHING", "ACCEPTED", "ARRIVED", "STARTED"] } },
                { driverId: req.user.id, status: { $in: ["ACCEPTED", "ARRIVED", "STARTED"] } }
            ],
            createdAt: { $gte: twelveHoursAgo }
        })
        .populate('createdBy', 'name email phone profilePhoto')
        .populate('driverId', 'name email phone profilePhoto');

        if (ride) {
            const rideObj = ride.toObject();
            if (ride.driverId) {
                const Vehicle = require("../models/vehicle").default;
                const vehicle = await Vehicle.findOne({ ownerId: (ride.driverId as any)._id });
                if (vehicle) {
                    rideObj.driverId = {
                        ...(rideObj.driverId as any),
                        vehicleNumber: vehicle.numberPlate,
                        vehicleType: vehicle.vehicleType,
                        vehicleModel: vehicle.vehicleModel
                    };
                }
            }
            return res.json(rideObj);
        }

        res.json(null);
    } catch (err: any) {
        console.error("Get active ride error:", err);
        res.status(500).json({ message: "Error fetching active ride" });
    }
};

// Update ride status
export const updateRideStatus = async (req: any, res: Response) => {
    try {
        const { rideId, status, location } = req.body;

        const ride = await Ride.findOne({ rideId });
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
        if (status === "ACCEPTED") ride.acceptedAt = new Date();
        if (status === "STARTED") ride.startedAt = new Date();
        if (status === "COMPLETED") ride.completedAt = new Date();
        if (status === "CANCELLED") ride.cancelledAt = new Date();

        // Update driver location if provided
        if (location) {
            ride.driverLocation = location;
        }

        await ride.save();

        res.json({ message: "Ride status updated", ride });
    } catch (err: any) {
        console.error("Update ride status error:", err);
        res.status(500).json({ message: "Error updating ride status" });
    }
};

// Cancel ride
export const cancelRide = async (req: any, res: Response) => {
    try {
        const { rideId } = req.body;

        const ride = await Ride.findOne({ rideId });
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
    } catch (err: any) {
        console.error("Cancel ride error:", err);
        res.status(500).json({ message: "Error cancelling ride" });
    }
};

// Rate ride
export const rateRide = async (req: any, res: Response) => {
    try {
        const { rideId, targetId, rating, feedback } = req.body;
        
        // Basic validation
        if (!rideId || !targetId || !rating) {
            return res.status(400).json({ message: "Missing required rating fields" });
        }

        // Save rating record
        const newRating = new Rating({
            rideId,
            userId: req.user.id,
            targetId,
            rating: Number(rating),
            feedback: feedback || ""
        });
        await newRating.save();

        // Update target's average rating (the person being rated)
        const user = await User.findById(targetId);
        if (user) {
            // Recalculate average rating using the database truth
            const ratings = await Rating.find({ targetId });
            const totalScore = ratings.reduce((acc, curr) => acc + curr.rating, 0);
            const avgRating = totalScore / ratings.length;
            
            user.rating = Math.round(avgRating * 10) / 10;
            // totalRides should represent actual trips, not just ratings counts, 
            // but for simple apps we often count these interchangeably.
            await user.save();
        }

        res.json({ message: "Thank you for your feedback!", avgRating: user?.rating });
    } catch (err: any) {
        console.error("Rate ride error:", err);
        res.status(500).json({ message: "Error saving rating" });
    }
};