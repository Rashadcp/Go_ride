import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import User from "../../models/user";
import Vehicle from "../../models/vehicle";
import Transaction from "../../models/transaction";
import EmergencyReport from "../../models/emergencyReport";
import Discount from "../../models/discount";
import Ride from "../../models/ride";
import { io } from "../../config/socket";
import { createNotification, bulkCreateNotifications } from "../notification/notification.controller";

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
        const { vehicleId } = req.params as any;
        let { status } = req.body; // APPROVED or REJECTED
        status = status?.toUpperCase();

        if (status === "REJECT") status = "REJECTED"; // Normalization helper

        if (!mongoose.isValidObjectId(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID format" });
        }

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status: Must be APPROVED or REJECTED" });
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
    } catch (err: any) {
        console.error("❌ APPROVE_DRIVER_ERROR:", err);
        res.status(500).json({ message: "Error updating driver status", error: err.message });
    }
};

export const deleteDriver = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid driver ID" });
        }

        // Find and delete the user
        const user = await User.findByIdAndDelete(id as string);
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
        const vehicles = await Vehicle.find();
        
        // Fetch report counts for each driver
        const reportCounts = await EmergencyReport.aggregate([
            { $group: { _id: "$driverId", count: { $sum: 1 } } }
        ]);

        // Map vehicles and report counts to drivers for a unified view
        const driversWithVehicles = drivers.map(driver => {
            const vehicle = vehicles.find(v => v.ownerId && v.ownerId.toString() === driver._id.toString());
            const reports = reportCounts.find(r => r._id && r._id.toString() === driver._id.toString());
            
            return {
                ...driver.toObject(),
                vehicle: vehicle || null,
                reportCount: reports ? reports.count : 0
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

        // Calculate Total Revenue from successful credits only
        const revenueData = await Transaction.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS" } },
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
        const monthlyRevenueMap = new Map(
            monthlyRevenueData.map(item => [`${item._id.year}-${item._id.month}`, item.total])
        );
        const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
            const date = new Date();
            date.setDate(1);
            date.setMonth(date.getMonth() - (5 - index));

            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const key = `${year}-${month}`;

            return {
                month: monthNames[month - 1],
                amount: monthlyRevenueMap.get(key) || 0
            };
        });

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
        const dailyRidesMap = new Map(
            dailyRidesData.map(item => {
                const key = `${item._id.month}-${item._id.day}`;
                return [key, item.count];
            })
        );
        const dailyRides = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(sevenDaysAgo);
            date.setDate(sevenDaysAgo.getDate() + index);

            const key = `${date.getMonth() + 1}-${date.getDate()}`;
            return {
                day: dayNames[date.getDay()],
                count: dailyRidesMap.get(key) || 0
            };
        });

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const firstDayOfLastMonth = new Date(firstDayOfMonth);
        firstDayOfLastMonth.setMonth(firstDayOfLastMonth.getMonth() - 1);
        const lastDayOfLastMonth = new Date(firstDayOfMonth);
        lastDayOfLastMonth.setSeconds(-1);

        const monthlyCreditsData = await Transaction.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS", createdAt: { $gte: firstDayOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const monthlyCredits = monthlyCreditsData[0]?.total || 0;

        const prevMonthRevenueData = await Transaction.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS", createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const prevMonthRevenue = prevMonthRevenueData[0]?.total || 0;

        const monthlyDebitsData = await Transaction.aggregate([
            { $match: { type: "DEBIT", status: "SUCCESS", createdAt: { $gte: firstDayOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const monthlyDebits = monthlyDebitsData[0]?.total || 0;

        const currentMonthRides = await Ride.countDocuments({ createdAt: { $gte: firstDayOfMonth } });
        const prevMonthRides = await Ride.countDocuments({ createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } });

        const prevMonthDriversCount = await User.countDocuments({ role: "DRIVER", createdAt: { $lt: firstDayOfMonth }, isDeleted: { $ne: true } });
        const currentMonthDriversCount = await User.countDocuments({ role: "DRIVER", createdAt: { $gte: firstDayOfMonth }, isDeleted: { $ne: true } });

        const revenueTrend = prevMonthRevenue > 0 ? ((monthlyCredits - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
        const ridesTrend = prevMonthRides > 0 ? ((currentMonthRides - prevMonthRides) / prevMonthRides) * 100 : 0;
        const driversTrend = prevMonthDriversCount > 0 ? ((currentMonthDriversCount - prevMonthDriversCount) / prevMonthDriversCount) * 100 : 0;
        
        const totalGrowth = Number(((revenueTrend + ridesTrend + driversTrend) / 3).toFixed(1));

        const activePromotions = await Discount.countDocuments({
            active: true,
            expiryDate: { $gte: new Date() }
        });
        
        const completedRideValueData = await Ride.aggregate([
            { $match: { status: "COMPLETED" } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$price" },
                    count: { $sum: 1 }
                }
            }
        ]);
        const avgTripValue = completedRideValueData[0]?.count
            ? Math.round(completedRideValueData[0].total / completedRideValueData[0].count)
            : 0;

        const totalTransactions = await Transaction.countDocuments({ status: "SUCCESS" });

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
                suspiciousUsers,
                totalTransactions,
                revenueTrend: Number(revenueTrend.toFixed(1)),
                ridesTrend: Number(ridesTrend.toFixed(1)),
                driversTrend: Number(driversTrend.toFixed(1)),
                totalGrowth
            },
            monthlyRevenue,
            dailyRides
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
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await User.findById(id as string);
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
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await User.findById(id as string);
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
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await User.findById(id as string);
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
        
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const objectId = new Types.ObjectId(id as string);

        const rides = await Ride.find({
            $or: [
                { createdBy: objectId },
                { driverId: objectId },
                { "passengers.userId": objectId }
            ]
        })
        .populate("createdBy", "name email profilePhoto")
        .populate("driverId", "name email profilePhoto")
        .sort({ createdAt: -1 });

        res.json(rides);
    } catch (err: any) {
        console.error("❌ ADMIN_RIDE_ERROR:", err);
        res.status(500).json({ 
            message: "❌ Internal Server Error - Ride System Failure", 
            error: err.message,
            stack: err.stack 
        });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await User.findById(id as string);
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
            .populate("driverId", "name email profilePhoto")
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
        ).populate("reporterId", "name email").populate("driverId", "name email");
        
        if (!report) return res.status(404).json({ message: "Report not found" });

        // Send notifications if resolved or under investigation
        if (status === "RESOLVED" || status === "INVESTIGATING") {
            const title = status === "RESOLVED" ? "Emergency Report Resolved" : "Safety Report Activity";
            const message = status === "RESOLVED" 
                ? `The safety report has been resolved. Action: ${resolutionNotes}`
                : "An administrator has started investigating the safety report.";

            // Notify Reporter
            if (report.reporterId) {
                const repId = (report.reporterId as any)._id?.toString() || report.reporterId.toString();
                await createNotification(repId, title, message, "SYSTEM");
                io.to(`user:${repId}`).emit("system:alert", { title, message, type: "SYSTEM" });
            }

            // Notify Driver if linked
            if (report.driverId) {
                const drvId = (report.driverId as any)._id?.toString() || report.driverId.toString();
                await createNotification(drvId, title, message, "SYSTEM");
                io.to(`user:${drvId}`).emit("system:alert", { title, message, type: "SYSTEM" });
            }
        }
        
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

        // Notify all users about the new discount
        const users = await User.find({ role: "USER", isDeleted: { $ne: true } }).select("_id");
        
        const notificationTitle = "New Discount Available! 🎁";
        const messageText = discount.type === "PERCENTAGE" ? `${discount.value}% OFF` : `₹${discount.value} FLAT OFF`;
        const notificationMessage = `Claim your ${messageText} with code: ${discount.code}. Limited time offer!`;

        // Broadcast real-time alert to all online users
        io.to("passengers-pool").emit("system:alert", { 
            title: notificationTitle, 
            message: notificationMessage, 
            type: "SYSTEM" 
        });

        // Save persistent notifications for all users in bulk (background)
        const userIds = users.map(u => u._id.toString());
        bulkCreateNotifications(userIds, notificationTitle, notificationMessage, "SYSTEM")
            .catch(err => console.error("Error broadcast-notifying users:", err));

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
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const type = req.query.type as string;
        const query: any = {};
        if (type) query.type = type.toUpperCase();

        const totalTransactions = await Transaction.countDocuments(query);
        const transactions = await Transaction.find(query)
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            transactions,
            currentPage: page,
            totalPages: Math.ceil(totalTransactions / limit),
            totalTransactions
        });
    } catch (err) {
        console.error("Error fetching transactions:", err);
        res.status(500).json({ message: "Error fetching transactions" });
    }
};

export const sendNotification = async (req: Request, res: Response) => {
    try {
        const { targetType, targetId, title, message, type = "SYSTEM" } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" });
        }

        let userIds: string[] = [];

        if (targetType === "ALL") {
            const users = await User.find({ isDeleted: { $ne: true } }).select("_id");
            userIds = users.map(u => u._id.toString());
            io.emit("system:alert", { title, message, type });
        } else if (targetType === "DRIVERS") {
            const drivers = await User.find({ role: "DRIVER", isDeleted: { $ne: true } }).select("_id");
            userIds = drivers.map(d => d._id.toString());
            io.to("drivers-pool").emit("system:alert", { title, message, type });
        } else if (targetType === "USERS") {
            const users = await User.find({ role: "USER", isDeleted: { $ne: true } }).select("_id");
            userIds = users.map(u => u._id.toString());
            io.to("passengers-pool").emit("system:alert", { title, message, type });
        } else if (targetType === "SPECIFIC") {
            if (!targetId || !mongoose.isValidObjectId(targetId)) {
                return res.status(400).json({ message: "Invalid target ID" });
            }
            userIds = [targetId];
            io.to(`user:${targetId}`).emit("system:alert", { title, message, type });
        }

        if (userIds.length > 0) {
            await bulkCreateNotifications(userIds, title, message, type);
        }

        res.json({ message: "Notifications sent successfully", targetCount: userIds.length });
    } catch (err) {
        console.error("Error sending notifications:", err);
        res.status(500).json({ message: "Error sending notifications" });
    }
};
