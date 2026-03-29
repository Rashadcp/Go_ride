import { Request, Response } from "express";
import User from "../models/user";
import Vehicle from "../models/vehicle";
import Transaction from "../models/transaction";
import EmergencyReport from "../models/emergencyReport";
import Discount from "../models/discount";
import Ride from "../models/ride";

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
        const drivers = await User.find({ role: "DRIVER", isDeleted: { $ne: true } }).select("-password");
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
        const totalUsers = await User.countDocuments({ role: "USER", isDeleted: { $ne: true } });
        const totalDrivers = await User.countDocuments({ role: "DRIVER", isDeleted: { $ne: true } });
        const pendingApprovals = await Vehicle.countDocuments({ status: "PENDING" });
        const blockedUsers = await User.countDocuments({ isBlocked: true, isDeleted: { $ne: true } });
        const suspiciousUsers = await User.countDocuments({ isSuspicious: true, isDeleted: { $ne: true } });

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

        const activeRides = await Ride.countDocuments({ status: { $in: ["ACCEPTED", "ARRIVED", "STARTED", "SEARCHING", "OPEN"] } });
        const cancelledRides = await Ride.countDocuments({ status: "CANCELLED" });
        const emergencyAlerts = await EmergencyReport.countDocuments({ status: "PENDING" });

        // Calculate Monthly Revenue (Real aggregation)
        const fiveMonthsAgo = new Date();
        fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

        const monthlyRevenueData = await Transaction.aggregate([
            { $match: { status: "SUCCESS", type: "CREDIT", createdAt: { $gte: fiveMonthsAgo } } },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyRevenue = monthlyRevenueData.map(item => ({
            month: monthNames[item._id.month - 1],
            amount: item.total
        }));

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const dailyRidesData = await Ride.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$createdAt" },
                        month: { $month: "$createdAt" },
                        dayOfWeek: { $dayOfWeek: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.month": 1, "_id.day": 1 } }
        ]);

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dailyRides = dailyRidesData.map(item => ({
            day: dayNames[item._id.dayOfWeek - 1],
            count: item.count
        }));

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const monthlyCreditsData = await Transaction.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS", createdAt: { $gte: firstDayOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const monthlyCredits = monthlyCreditsData[0]?.total || 0;

        const monthlyDebitsData = await Transaction.aggregate([
            { $match: { type: "DEBIT", status: "SUCCESS", createdAt: { $gte: firstDayOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const monthlyDebits = monthlyDebitsData[0]?.total || 0;

        const activePromotions = await Discount.countDocuments();
        
        const successTxCount = await Transaction.countDocuments({ status: "SUCCESS" });
        const avgTripValue = successTxCount > 0 ? Math.round(totalRevenue / successTxCount) : 0;

        res.json({
            stats: {
                totalUsers,
                totalDrivers,
                pendingApprovals,
                activeRides,
                cancelledRides,
                totalRevenue,
                walletBalance,
                emergencyAlerts,
                monthlyCredits,
                monthlyDebits,
                avgTripValue,
                activePromotions,
                blockedUsers,
                suspiciousUsers
            },
            monthlyRevenue: monthlyRevenue.length > 0 ? monthlyRevenue : [
                { month: "Jan", amount: 0 },
                { month: "Feb", amount: 0 },
                { month: "Mar", amount: 0 },
                { month: "Apr", amount: 0 },
                { month: "May", amount: 0 }
            ],
            dailyRides: dailyRides.length > 0 ? dailyRides : [
                { day: "Mon", count: 0 },
                { day: "Tue", count: 0 },
                { day: "Wed", count: 0 },
                { day: "Thu", count: 0 },
                { day: "Fri", count: 0 },
                { day: "Sat", count: 0 },
                { day: "Sun", count: 0 }
            ]
        });
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        res.status(500).json({ message: "Error fetching stats" });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({ role: "USER", isDeleted: { $ne: true } }).select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users" });
    }
};

export const toggleBlockUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: user.isBlocked });
    } catch (err) {
        res.status(500).json({ message: "Error toggling user block status" });
    }
};

export const toggleFlagSuspicious = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isSuspicious = !user.isSuspicious;
        await user.save();

        res.json({ message: `User ${user.isSuspicious ? 'flagged' : 'unflagged'} successfully`, isSuspicious: user.isSuspicious });
    } catch (err) {
        res.status(500).json({ message: "Error toggling user suspicious status" });
    }
};

export const softDeleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isDeleted = true;
        // Optionally anonymize data or set status to INACTIVE
        user.status = "INACTIVE";
        await user.save();

        res.json({ message: "User account deleted successfully (soft delete)" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting user" });
    }
};

export const getUserRideHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Search for rides where user is either the passenger or the driver
        const rides = await Ride.find({
            $or: [
                { userId: id },
                { driverId: id }
            ]
        })
        .populate("userId", "name email profilePhoto")
        .populate("driverId", "name email profilePhoto")
        .sort({ createdAt: -1 });

        res.json(rides);
    } catch (err) {
        res.status(500).json({ message: "Error fetching user ride history" });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update fields if they are provided
        if (updates.name) user.name = updates.name;
        if (updates.email) user.email = updates.email;
        if (updates.phone) (user as any).phone = updates.phone; // phone is often in User model but check schema
        if (updates.role) user.role = updates.role;
        if (updates.status) user.status = updates.status;

        await user.save();
        res.json({ message: "User updated successfully", user });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ message: "Error updating user" });
    }
};

export const getEmergencyReports = async (req: Request, res: Response) => {
    try {
        const reports = await EmergencyReport.find()
            .populate("reporterId", "name email phone")
            .populate("rideId", "rideId driverId")
            .sort({ createdAt: -1 }); // Newest first
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: "Error fetching emergency reports" });
    }
};

export const resolveEmergencyReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, resolutionNotes } = req.body;

        if (!["PENDING", "INVESTIGATING", "RESOLVED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const report = await EmergencyReport.findByIdAndUpdate(
            id,
            { status, resolutionNotes, updatedAt: new Date() },
            { new: true }
        ).populate("reporterId", "name email");
        
        if (!report) return res.status(404).json({ message: "Report not found" });
        
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
