import { Response } from "express";
import Ride from "../models/ride";
import User from "../models/user";

// Get user's ride history
export const getUserRides = async (req: any, res: Response) => {
    try {
        const rides = await Ride.find({
            $or: [
                { createdBy: req.user.id },
                { driverId: req.user.id }
            ]
        })
        .populate('createdBy', 'name email phone')
        .populate('driverId', 'name email phone')
        .sort({ createdAt: -1 });

        res.json(rides);
    } catch (err: any) {
        console.error("Get rides error:", err);
        res.status(500).json({ message: "Error fetching rides" });
    }
};

// Get active ride for user
export const getActiveRide = async (req: any, res: Response) => {
    try {
        const ride = await Ride.findOne({
            $or: [
                { createdBy: req.user.id, status: { $in: ["REQUESTED", "SEARCHING", "ACCEPTED", "ARRIVED", "STARTED"] } },
                { driverId: req.user.id, status: { $in: ["ACCEPTED", "ARRIVED", "STARTED"] } }
            ]
        })
        .populate('createdBy', 'name email phone')
        .populate('driverId', 'name email phone');

        res.json(ride || null);
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