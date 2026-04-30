import { Response } from "express";
import asyncHandler from "express-async-handler";
import Ride from "../../models/ride";
import { calculateRideQuote } from "../../common/utils/fare-engine";

export const createCarpool = asyncHandler(async (req: any, res: Response) => {
    const { rideId, pickup, drop, distance, duration, departureTime, availableSeats, vehicleType, carType } = req.body;
    
    await Ride.updateMany(
        { driverId: req.user.id, type: "CARPOOL", status: "OPEN" },
        { status: "CANCELLED" }
    );

    if (!pickup?.lat || !pickup?.lng || !drop?.lat || !drop?.lng) {
        console.error("Missing coordinates in carpool request:", { pickup, drop });
        res.status(400);
        throw new Error("Pickup and destination coordinates are required.");
    }
    
    const quote = calculateRideQuote({
        vehicleType,
        distanceKm: distance,
        durationMinutes: duration,
        isSharedRide: true,
        seatCount: Number(availableSeats || 1),
    });

    const newRide = new Ride({
        rideId,
        type: "CARPOOL",
        createdBy: req.user.id,
        driverId: req.user.id,
        status: "OPEN",
        pickup: {
            ...pickup,
            location: { type: "Point", coordinates: [pickup.lng, pickup.lat] }
        },
        drop: {
            ...drop,
            location: { type: "Point", coordinates: [drop.lng, drop.lat] }
        },
        price: quote.totalFare,
        originalPrice: quote.totalFare,
        pricePerSeat: quote.perSeatFare,
        originalPricePerSeat: quote.perSeatFare,
        distance,
        duration,
        departureTime,
        availableSeats,
        requestedVehicleType: vehicleType || "go",
        carType,
        isSharedRide: true
    });

    await newRide.save();
    
    res.status(201).json(newRide);
});

export const searchCarpools = asyncHandler(async (req: any, res: Response) => {
    const { page = 1, limit = 10, search, maxPrice, carType, seats } = req.query;

    const query: any = { status: "OPEN", type: "CARPOOL" };

    if (search) {
        query.$or = [
            { "pickup.label": { $regex: search, $options: "i" } },
            { "drop.label": { $regex: search, $options: "i" } }
        ];
    }

    if (maxPrice) {
        query.pricePerSeat = { $lte: Number(maxPrice) };
    }

    if (carType) {
        query.carType = carType;
    }

    if (seats) {
        query.availableSeats = { $gte: Number(seats) };
    }

    // Always filter out the user's own carpools
    if (req.user && req.user.id) {
        query.driverId = { $ne: req.user.id };
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const rides = await Ride.find(query)
        .populate("createdBy", "name email profilePhoto")
        .sort({ departureTime: 1 })
        .skip(skip)
        .limit(limitNumber);

    const total = await Ride.countDocuments(query);

    res.json({
        data: rides,
        pagination: {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber)
        }
    });
});

export const joinCarpool = asyncHandler(async (req: any, res: Response) => {
    const { rideId } = req.params;
    const { seats = 1 } = req.body;

    const ride = await Ride.findOne({ rideId });
    if (!ride || ride.type !== "CARPOOL" || ride.status !== "OPEN") {
        res.status(404);
        throw new Error("Carpool not available");
    }

    if (ride.availableSeats < seats) {
        res.status(400);
        throw new Error("Not enough seats available");
    }

    res.json({ message: "Request to join sent", ride });
});
