import { Response } from "express";
import Vehicle from "../../models/vehicle";
import User from "../../models/user";

export const getMyVehicle = async (req: any, res: Response) => {
    try {
        const vehicle = await Vehicle.findOne({ ownerId: req.user.id });
        if (!vehicle) {
            return res.status(404).json({ message: "No vehicle found for this user." });
        }
        res.json(vehicle);
    } catch (err: any) {
        console.error("Get vehicle error:", err);
        res.status(500).json({ message: "Error fetching vehicle details" });
    }
};

export const createVehicle = async (req: any, res: Response) => {
    try {
        const { numberPlate, vehicleModel, vehicleType } = req.body;
        const files = req.files as any;

        const existingVehicle = await Vehicle.findOne({ ownerId: req.user.id });
        if (existingVehicle) {
            return res.status(400).json({ message: "You already have a vehicle registered." });
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

        await newVehicle.save();

        // Optionally update user status if they are transitioning to driver
        const user = await User.findById(req.user.id);
        if (user && user.role !== "ADMIN") {
            // We don't automatically change role to DRIVER here, 
            // but we could set a flag or just keep it as is until approval.
        }

        res.status(201).json({ message: "Vehicle registered successfully", vehicle: newVehicle });
    } catch (err: any) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "This number plate is already registered." });
        }
        console.error("Create vehicle error:", err);
        res.status(500).json({ message: "Error registering vehicle" });
    }
};

export const updateVehicle = async (req: any, res: Response) => {
    try {
        const { numberPlate, vehicleModel, vehicleType } = req.body;
        const files = req.files as any;

        const vehicle = await (Vehicle as any).findOne({ ownerId: req.user.id });
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found." });
        }

        if (numberPlate) vehicle.numberPlate = numberPlate;
        if (vehicleModel) vehicle.vehicleModel = vehicleModel;
        if (vehicleType) vehicle.vehicleType = vehicleType;

        if (files?.rc?.[0]) vehicle.rc = files.rc[0].location;
        if (files?.vehiclePhotos) {
            vehicle.vehiclePhotos = files.vehiclePhotos.map((f: any) => f.location);
        }

        // Reset status to PENDING on update to require re-approval
        vehicle.status = "PENDING";

        await vehicle.save();
        res.json({ message: "Vehicle updated successfully", vehicle });
    } catch (err: any) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "This number plate is already registered." });
        }
        console.error("Update vehicle error:", err);
        res.status(500).json({ message: "Error updating vehicle details" });
    }
};

export const deleteVehicle = async (req: any, res: Response) => {
    try {
        const vehicle = await Vehicle.findOneAndDelete({ ownerId: req.user.id });
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found." });
        }
        res.json({ message: "Vehicle deleted successfully" });
    } catch (err: any) {
        console.error("Delete vehicle error:", err);
        res.status(500).json({ message: "Error deleting vehicle" });
    }
};
