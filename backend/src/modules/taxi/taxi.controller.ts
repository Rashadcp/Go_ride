import { Response } from "express";
import Ride from "../../models/ride";
import asyncHandler from "express-async-handler";
import { getPendingRideRequestsForDriver } from "./taxi.service";

export const requestTaxi = asyncHandler(async (req: any, res: Response) => {
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
});

export const getTaxiHistory = asyncHandler(async (req: any, res: Response) => {
    const rides = await Ride.find({
        createdBy: req.user.id,
        type: "TAXI"
    }).sort({ createdAt: -1 });
    res.json(rides);
});

export const getPendingDriverRequests = asyncHandler(async (req: any, res: Response) => {
    const { location, vehicleType } = req.body;

    if (!location?.lat || !location?.lng) {
        res.status(400);
        throw new Error("Driver location is required to fetch pending requests.");
    }

    const pendingRequests = await getPendingRideRequestsForDriver({
        driverId: req.user.id,
        location,
        vehicleType
    });

    res.json({ requests: pendingRequests });
});
