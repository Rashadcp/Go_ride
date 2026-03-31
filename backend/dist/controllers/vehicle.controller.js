"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVehicle = exports.updateVehicle = exports.createVehicle = exports.getMyVehicle = void 0;
const vehicle_1 = __importDefault(require("../models/vehicle"));
const user_1 = __importDefault(require("../models/user"));
const getMyVehicle = async (req, res) => {
    try {
        const vehicle = await vehicle_1.default.findOne({ ownerId: req.user.id });
        if (!vehicle) {
            return res.status(404).json({ message: "No vehicle found for this user." });
        }
        res.json(vehicle);
    }
    catch (err) {
        console.error("Get vehicle error:", err);
        res.status(500).json({ message: "Error fetching vehicle details" });
    }
};
exports.getMyVehicle = getMyVehicle;
const createVehicle = async (req, res) => {
    try {
        const { numberPlate, vehicleModel, vehicleType } = req.body;
        const files = req.files;
        const existingVehicle = await vehicle_1.default.findOne({ ownerId: req.user.id });
        if (existingVehicle) {
            return res.status(400).json({ message: "You already have a vehicle registered." });
        }
        const newVehicle = new vehicle_1.default({
            ownerId: req.user.id,
            numberPlate,
            vehicleModel,
            vehicleType,
            rc: files?.rc?.[0]?.location,
            vehiclePhotos: (files?.vehiclePhotos || []).map((f) => f.location),
            status: "PENDING"
        });
        await newVehicle.save();
        // Optionally update user status if they are transitioning to driver
        const user = await user_1.default.findById(req.user.id);
        if (user && user.role !== "ADMIN") {
            // We don't automatically change role to DRIVER here, 
            // but we could set a flag or just keep it as is until approval.
        }
        res.status(201).json({ message: "Vehicle registered successfully", vehicle: newVehicle });
    }
    catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "This number plate is already registered." });
        }
        console.error("Create vehicle error:", err);
        res.status(500).json({ message: "Error registering vehicle" });
    }
};
exports.createVehicle = createVehicle;
const updateVehicle = async (req, res) => {
    try {
        const { numberPlate, vehicleModel, vehicleType } = req.body;
        const files = req.files;
        const vehicle = await vehicle_1.default.findOne({ ownerId: req.user.id });
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found." });
        }
        if (numberPlate)
            vehicle.numberPlate = numberPlate;
        if (vehicleModel)
            vehicle.vehicleModel = vehicleModel;
        if (vehicleType)
            vehicle.vehicleType = vehicleType;
        if (files?.rc?.[0])
            vehicle.rc = files.rc[0].location;
        if (files?.vehiclePhotos) {
            vehicle.vehiclePhotos = files.vehiclePhotos.map((f) => f.location);
        }
        // Reset status to PENDING on update to require re-approval
        vehicle.status = "PENDING";
        await vehicle.save();
        res.json({ message: "Vehicle updated successfully", vehicle });
    }
    catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "This number plate is already registered." });
        }
        console.error("Update vehicle error:", err);
        res.status(500).json({ message: "Error updating vehicle details" });
    }
};
exports.updateVehicle = updateVehicle;
const deleteVehicle = async (req, res) => {
    try {
        const vehicle = await vehicle_1.default.findOneAndDelete({ ownerId: req.user.id });
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found." });
        }
        res.json({ message: "Vehicle deleted successfully" });
    }
    catch (err) {
        console.error("Delete vehicle error:", err);
        res.status(500).json({ message: "Error deleting vehicle" });
    }
};
exports.deleteVehicle = deleteVehicle;
