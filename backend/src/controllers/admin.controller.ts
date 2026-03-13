import { Request, Response } from "express";
import User from "../models/user";
import Vehicle from "../models/vehicle";
import Transaction from "../models/transaction";
import EmergencyReport from "../models/emergencyReport";
import Discount from "../models/discount";

export const getPendingDrivers = async (req: Request, res: Response) => {
    try {
        // Drivers with PENDING status and their vehicles
        const pendingVehicles = await Vehicle.find({ status: "PENDING" }).populate("ownerId", "name email profilePhoto license aadhaar");
        res.json(pendingVehicles);
    } catch (err) {
        res.status(500).json({ message: "Error fetching pending drivers" });
    }
};

export const approveDriver = async (req: Request, res: Response) => {
    try {
        const { vehicleId } = req.params;
        const { status } = req.body; // APPROVED or REJECTED

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

        vehicle.status = status;
        await vehicle.save();

        // Update user status as well
        const user = await User.findById(vehicle.ownerId);
        if (user) {
            user.status = status === "APPROVED" ? "APPROVED" : "REJECTED";
            await user.save();
        }

        res.json({ message: `Driver ${status.toLowerCase()} successfully`, vehicle });
    } catch (err) {
        res.status(500).json({ message: "Error updating driver status" });
    }
};

export const deleteDriver = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find and delete the user
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Delete associated vehicle if exists
        await Vehicle.deleteMany({ ownerId: id });

        res.json({ message: "Driver and associated assets deleted successfully" });
    } catch (err) {
        console.error("Error deleting driver:", err);
        res.status(500).json({ message: "Error deleting driver" });
    }
};

export const getAllDrivers = async (req: Request, res: Response) => {
    try {
        const drivers = await User.find({ role: "DRIVER" }).select("-password");
        const vehicles = await Vehicle.find().populate("ownerId", "name email");

        // Map vehicles to drivers for a unified view
        const driversWithVehicles = drivers.map(driver => {
            const vehicle = vehicles.find(v => v.ownerId && (v.ownerId as any)._id.toString() === driver._id.toString());
            return {
                ...driver.toObject(),
                vehicle: vehicle || null
            };
        });

        res.json(driversWithVehicles);
    } catch (err) {
        console.error("Error fetching all drivers:", err);
        res.status(500).json({ message: "Error fetching drivers" });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const totalUsers = await User.countDocuments({ role: "USER" });
        const totalDrivers = await User.countDocuments({ role: "DRIVER" });
        const pendingApprovals = await Vehicle.countDocuments({ status: "PENDING" });

        // Calculate Total Revenue (Credits only)
        const revenueData = await Transaction.aggregate([
            { $match: { status: "SUCCESS" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalRevenue = revenueData[0]?.total || 0;

        // Calculate Wallet Balance (Credits - Debits)
        const creditData = await Transaction.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const debitData = await Transaction.aggregate([
            { $match: { type: "DEBIT", status: "SUCCESS" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const walletBalance = (creditData[0]?.total || 0) - (debitData[0]?.total || 0);

        // Simulated data for charts since we don't have a full history yet
        const monthlyRevenue = [
            { month: "Jun", amount: totalRevenue * 0.15 },
            { month: "Jul", amount: totalRevenue * 0.18 },
            { month: "Aug", amount: totalRevenue * 0.22 },
            { month: "Sep", amount: totalRevenue * 0.25 },
            { month: "Oct", amount: totalRevenue * 0.20 }
        ];

        res.json({
            stats: {
                totalUsers,
                totalDrivers,
                pendingApprovals,
                activeRides: 0, // Placeholder for future feature
                cancelledRides: 0,
                totalRevenue,
                walletBalance,
                emergencyAlerts: 0
            },
            monthlyRevenue
        });
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        res.status(500).json({ message: "Error fetching stats" });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({ role: "USER" }).select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users" });
    }
};

export const getEmergencyReports = async (req: Request, res: Response) => {
    try {
        const reports = await EmergencyReport.find().populate("reporterId", "name email");
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: "Error fetching emergency reports" });
    }
};

export const resolveEmergencyReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, resolutionNotes } = req.body;
        const report = await EmergencyReport.findByIdAndUpdate(id, { status, resolutionNotes }, { new: true });
        res.json(report);
    } catch (err) {
        res.status(500).json({ message: "Error resolving report" });
    }
};

export const getDiscounts = async (req: Request, res: Response) => {
    try {
        const discounts = await Discount.find();
        res.json(discounts);
    } catch (err) {
        res.status(500).json({ message: "Error fetching discounts" });
    }
};

export const createDiscount = async (req: Request, res: Response) => {
    try {
        const discount = new Discount(req.body);
        await discount.save();
        res.json(discount);
    } catch (err) {
        res.status(500).json({ message: "Error creating discount" });
    }
};

export const deleteDiscount = async (req: Request, res: Response) => {
    try {
        await Discount.findByIdAndDelete(req.params.id);
        res.json({ message: "Discount deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting discount" });
    }
};

export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find().populate("userId", "name email");
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: "Error fetching transactions" });
    }
};
