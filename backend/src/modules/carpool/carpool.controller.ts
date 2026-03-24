import { Response } from "express";
import Ride from "../../models/ride";

export const createCarpool = async (req: any, res: Response) => {
    try {
        const { rideId, pickup, drop, price, pricePerSeat, distance, duration, departureTime, availableSeats } = req.body;
        
        const newRide = new Ride({
            rideId,
            type: "CARPOOL",
            createdBy: req.user.id,
            status: "OPEN",
            pickup,
            drop,
            price,
            pricePerSeat,
            distance,
            duration,
            departureTime,
            availableSeats
        });

        await newRide.save();
        res.status(201).json(newRide);
    } catch (err: any) {
        res.status(500).json({ message: "Error creating carpool", error: err.message });
    }
};

export const searchCarpools = async (req: any, res: Response) => {
    try {
        const { pickupLat, pickupLng, dropLat, dropLng } = req.query;
        // Basic search: OPEN rides
        const query: any = { status: "OPEN", type: "CARPOOL" };
        
        // Simple radius filtering if provided
        if (pickupLat && pickupLng) {
            // MongoDB geospatial search could be added here
        }

        const rides = await Ride.find(query)
            .populate('createdBy', 'name email profilePhoto')
            .sort({ departureTime: 1 });
        res.json(rides);
    } catch (err: any) {
        res.status(500).json({ message: "Error searching carpools" });
    }
};

export const joinCarpool = async (req: any, res: Response) => {
    try {
        const { rideId } = req.params;
        const { seats = 1 } = req.body;

        const ride = await Ride.findOne({ rideId });
        if (!ride || ride.type !== "CARPOOL" || ride.status !== "OPEN") {
            return res.status(404).json({ message: "Carpool not available" });
        }

        if (ride.availableSeats < seats) {
            return res.status(400).json({ message: "Not enough seats available" });
        }

        // Logic here for join-request (requires driver approval in socket)
        // Or directly join for now if it's instant?
        // Blueprint says: "Join request → approval"

        res.json({ message: "Request to join sent", ride });
    } catch (err: any) {
        res.status(500).json({ message: "Error joining carpool" });
    }
};
