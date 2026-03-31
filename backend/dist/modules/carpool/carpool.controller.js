"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinCarpool = exports.searchCarpools = exports.createCarpool = void 0;
const ride_1 = __importDefault(require("../../models/ride"));
const createCarpool = async (req, res) => {
    try {
        const { rideId, pickup, drop, price, pricePerSeat, distance, duration, departureTime, availableSeats, vehicleType } = req.body;
        // Cancel any existing active carpools for this driver 
        // to prevent duplicate listings
        await ride_1.default.updateMany({ driverId: req.user.id, type: "CARPOOL", status: "OPEN" }, { status: "CANCELLED" });
        if (!pickup?.lat || !pickup?.lng || !drop?.lat || !drop?.lng) {
            console.error("❌ Missing coordinates in carpool request:", { pickup, drop });
            return res.status(400).json({ message: "Pickup and destination coordinates are required." });
        }
        const newRide = new ride_1.default({
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
            availableSeats,
            requestedVehicleType: vehicleType || "go"
        });
        await newRide.save();
        res.status(201).json(newRide);
    }
    catch (err) {
        console.error("❌ Error creating carpool:", err);
        res.status(500).json({ message: "Error creating carpool", error: err.message });
    }
};
exports.createCarpool = createCarpool;
const searchCarpools = async (req, res) => {
    try {
        const { pickupLat, pickupLng, dropLat, dropLng } = req.query;
        // Basic search: OPEN rides
        const query = { status: "OPEN", type: "CARPOOL" };
        // Simple radius filtering if provided
        if (pickupLat && pickupLng) {
            // MongoDB geospatial search could be added here
        }
        const rides = await ride_1.default.find(query)
            .populate('createdBy', 'name email profilePhoto')
            .sort({ departureTime: 1 });
        res.json(rides);
    }
    catch (err) {
        res.status(500).json({ message: "Error searching carpools" });
    }
};
exports.searchCarpools = searchCarpools;
const joinCarpool = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { seats = 1 } = req.body;
        const ride = await ride_1.default.findOne({ rideId });
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
    }
    catch (err) {
        res.status(500).json({ message: "Error joining carpool" });
    }
};
exports.joinCarpool = joinCarpool;
