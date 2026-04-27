import { Response } from "express";
import Vehicle from "../../models/vehicle";
import User from "../../models/user";
import asyncHandler from "express-async-handler";

export const getMyVehicle = asyncHandler(async (req: any, res: Response) => {
    const vehicle = await Vehicle.findOne({ ownerId: req.user.id });
    if (!vehicle) {
        res.status(404);
        throw new Error("No vehicle found for this user.");
    }
    res.json(vehicle);
});

export const createVehicle = asyncHandler(async (req: any, res: Response) => {
    const { numberPlate, vehicleModel, vehicleType } = req.body;
    const files = req.files as any;

    const existingVehicle = await Vehicle.findOne({ ownerId: req.user.id });
    if (existingVehicle) {
        res.status(400);
        throw new Error("You already have a vehicle registered.");
    }

    const newVehicle = new Vehicle({
        ownerId: req.user.id,
        numberPlate,
        vehicleModel,
        vehicleType,
        rc: files?.rc?.[0]?.location,
        vehiclePhotos: (files?.vehiclePhotos || []).map((f: any) => f.location),
        status: "PENDING"
    });

    try {
        await newVehicle.save();
    } catch (err: any) {
        if (err.code === 11000) {
            res.status(400);
            throw new Error("This number plate is already registered.");
        }
        throw err;
    }

    const user = await User.findById(req.user.id);
    if (user && user.role !== "ADMIN") {
    }

    res.status(201).json({ message: "Vehicle registered successfully", vehicle: newVehicle });
});

export const updateVehicle = asyncHandler(async (req: any, res: Response) => {
    const { numberPlate, vehicleModel, vehicleType } = req.body;
    const files = req.files as any;

    const vehicle = await (Vehicle as any).findOne({ ownerId: req.user.id });
    if (!vehicle) {
        res.status(404);
        throw new Error("Vehicle not found.");
    }

    if (numberPlate) vehicle.numberPlate = numberPlate;
    if (vehicleModel) vehicle.vehicleModel = vehicleModel;
    if (vehicleType) vehicle.vehicleType = vehicleType;

    if (files?.rc?.[0]) vehicle.rc = files.rc[0].location;
    if (files?.vehiclePhotos) {
        vehicle.vehiclePhotos = files.vehiclePhotos.map((f: any) => f.location);
    }

    vehicle.status = "PENDING";

    try {
        await vehicle.save();
    } catch (err: any) {
        if (err.code === 11000) {
            res.status(400);
            throw new Error("This number plate is already registered.");
        }
        throw err;
    }
    res.json({ message: "Vehicle updated successfully", vehicle });
});

export const deleteVehicle = asyncHandler(async (req: any, res: Response) => {
    const vehicle = await Vehicle.findOneAndDelete({ ownerId: req.user.id });
    if (!vehicle) {
        res.status(404);
        throw new Error("Vehicle not found.");
    }
    res.json({ message: "Vehicle deleted successfully" });
});
