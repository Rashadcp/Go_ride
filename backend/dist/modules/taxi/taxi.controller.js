"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaxiHistory = exports.requestTaxi = void 0;
const ride_1 = __importDefault(require("../../models/ride"));
const requestTaxi = async (req, res) => {
    try {
        const { rideId, pickup, drop, price, distance, duration, requestedVehicleType } = req.body;
        const newRide = new ride_1.default({
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
    }
    catch (err) {
        res.status(500).json({ message: "Error requesting taxi", error: err.message });
    }
};
exports.requestTaxi = requestTaxi;
const getTaxiHistory = async (req, res) => {
    try {
        const rides = await ride_1.default.find({
            createdBy: req.user.id,
            type: "TAXI"
        }).sort({ createdAt: -1 });
        res.json(rides);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching taxi history" });
    }
};
exports.getTaxiHistory = getTaxiHistory;
