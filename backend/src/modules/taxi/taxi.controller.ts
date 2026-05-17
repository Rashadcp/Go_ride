import { Response } from "express";
import Ride from "../ride/ride.model";
import asyncHandler from "express-async-handler";
import {
    createPendingTaxiRideRequest,
    getPendingRideRequestsForDriver,
    markRideRequestsBroadcastedToDriver,
    rideRequestToDriverPayload
} from "./taxi.service";

export const requestTaxi = asyncHandler(async (req: any, res: Response) => {
    const { rideId, pickup, drop, price, distance, duration, requestedVehicleType } = req.body;
    
    const newRide = await createPendingTaxiRideRequest({
        rideId,
        createdBy: req.user.id,
        pickup,
        drop,
        price,
        distance,
        duration,
        requestedVehicleType
    });
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
        vehicleType,
        excludePreviouslyBroadcasted: false
    });

    await markRideRequestsBroadcastedToDriver({
        driverId: req.user.id,
        rideIds: pendingRequests.map((ride: any) => ride._id)
    });

    res.json({ requests: pendingRequests.map((ride: any) => rideRequestToDriverPayload(ride)) });
});
