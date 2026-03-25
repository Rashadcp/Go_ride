import { Response } from "express";
import Ride from "../../models/ride";

export const createCarpool = async (req: any, res: Response) => {
    try {
        const { rideId, pickup, drop, price, pricePerSeat, distance, duration, departureTime, availableSeats } = req.body;
        
        if (!pickup?.lat || !pickup?.lng || !drop?.lat || !drop?.lng) {
            console.error("❌ Missing coordinates in carpool request:", { pickup, drop });
            return res.status(400).json({ message: "Pickup and destination coordinates are required." });
        }
        
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
            price,
            pricePerSeat,
            distance,
            duration,
            departureTime,
            availableSeats
        });

        await newRide.save();
        
        // Fetch user name for the console log
        const User = require("../../models/user").default;
        const hostUser = await User.findById(req.user.id).select('name');

        console.log(`-----------------------------------------`);
        console.log(`🚗 [NEW CARPOOL SHARED]`);
        console.log(`   Ride ID: ${rideId}`);
        console.log(`   Host Driver: ${hostUser?.name || 'Unknown'} (${req.user.id})`);
        console.log(`   Pickup: ${pickup.label || 'Unknown location'}`);
        console.log(`   Destination: ${drop.label || 'Unknown location'}`);
        console.log(`   Available Seats: ${availableSeats}`);
        console.log(`   Price per Seat: ${pricePerSeat}`);
        console.log(`-----------------------------------------`);

        res.status(201).json(newRide);
    } catch (err: any) {
        console.error("❌ Error creating carpool:", err);
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
