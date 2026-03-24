import { Response } from "express";
import Ride from "../../models/ride";

export const requestTaxi = async (req: any, res: Response) => {
    try {
        const { rideId, pickup, drop, price, distance, duration, requestedVehicleType } = req.body;
        
        const newRide = new Ride({
            rideId,
            type: "TAXI",
            createdBy: req.user.id,
            status: "SEARCHING",
            pickup,
            drop,
            price,
            distance,
            duration,
            requestedVehicleType
        });

        await newRide.save();
        res.status(201).json(newRide);
    } catch (err: any) {
        res.status(500).json({ message: "Error requesting taxi", error: err.message });
    }
};

export const getTaxiHistory = async (req: any, res: Response) => {
    try {
        const rides = await Ride.find({
            createdBy: req.user.id,
            type: "TAXI"
        }).sort({ createdAt: -1 });
        res.json(rides);
    } catch (err: any) {
        res.status(500).json({ message: "Error fetching taxi history" });
    }
};
