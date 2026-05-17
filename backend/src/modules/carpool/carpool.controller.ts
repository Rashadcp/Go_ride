import { Response } from "express";
import asyncHandler from "express-async-handler";
import Ride from "../ride/ride.model";
import { calculateRideQuote } from "../../common/utils/fare-engine";

export const createCarpool = asyncHandler(async (req: any, res: Response) => {
    const { rideId, pickup, drop, distance, duration, departureTime, availableSeats, vehicleType, carType } = req.body;
    
    console.log("Creating carpool ride:", { rideId, userId: req.user?._id });

    if (!req.user?._id) {
        res.status(401);
        throw new Error("Authentication required. User ID not found.");
    }

    // Cancel any existing OPEN carpool rides for this driver to avoid duplicates
    try {
        await Ride.updateMany(
            { driverId: req.user._id, type: "CARPOOL", status: "OPEN" },
            { status: "CANCELLED" }
        );
    } catch (updateErr) {
        console.error("Error cancelling existing carpools:", updateErr);
        // Continue anyway as this is a cleanup step
    }

    // Strict coordinate validation (allowing 0)
    const isValidCoord = (val: any) => typeof val === 'number' && !isNaN(val);
    
    if (!isValidCoord(pickup?.lat) || !isValidCoord(pickup?.lng) || 
        !isValidCoord(drop?.lat) || !isValidCoord(drop?.lng)) {
        console.error("Invalid coordinates in carpool request:", { pickup, drop });
        res.status(400);
        throw new Error("Valid pickup and destination coordinates are required.");
    }
    
    const seatCount = Number(availableSeats || 1);

    const quote = calculateRideQuote({
        vehicleType,
        distanceKm: distance,
        durationMinutes: duration,
        isSharedRide: true,
        seatCount: seatCount,
    });

    const newRide = new Ride({
        rideId: rideId || `POOL-${Date.now()}`,
        type: "CARPOOL",
        createdBy: req.user._id,
        driverId: req.user._id,
        status: "OPEN",
        pickup: {
            ...pickup,
            location: { type: "Point", coordinates: [Number(pickup.lng), Number(pickup.lat)] }
        },
        drop: {
            ...drop,
            location: { type: "Point", coordinates: [Number(drop.lng), Number(drop.lat)] }
        },
        price: quote.totalFare,
        originalPrice: quote.totalFare,
        pricePerSeat: quote.perSeatFare,
        originalPricePerSeat: quote.perSeatFare,
        distance: Number(distance || 0),
        duration: Number(duration || 0),
        departureTime: departureTime || new Date().toISOString(),
        availableSeats: seatCount,
        requestedVehicleType: vehicleType || "go",
        carType,
        isSharedRide: true
    });

    try {
        await newRide.save();
        console.log("Successfully created carpool ride:", newRide.rideId);
        res.status(201).json(newRide);
    } catch (saveErr: any) {
        console.error("Error saving carpool ride:", saveErr);
        
        if (saveErr.code === 11000) {
            res.status(409);
            throw new Error("A ride with this ID already exists. Please try again.");
        }
        
        res.status(500);
        throw new Error(`Failed to create carpool: ${saveErr.message}`);
    }
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
