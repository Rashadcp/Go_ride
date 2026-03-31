"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.getAllTransactions = exports.deleteDiscount = exports.createDiscount = exports.getDiscounts = exports.resolveEmergencyReport = exports.getEmergencyReports = exports.updateUser = exports.getUserRideHistory = exports.softDeleteUser = exports.toggleFlagSuspicious = exports.toggleBlockUser = exports.getAllUsers = exports.getDashboardStats = exports.getAllDrivers = exports.deleteDriver = exports.approveDriver = exports.getPendingDrivers = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const user_1 = __importDefault(require("../../models/user"));
const vehicle_1 = __importDefault(require("../../models/vehicle"));
const transaction_1 = __importDefault(require("../../models/transaction"));
const emergencyReport_1 = __importDefault(require("../../models/emergencyReport"));
const discount_1 = __importDefault(require("../../models/discount"));
const ride_1 = __importDefault(require("../../models/ride"));
const socket_1 = require("../../config/socket");
const notification_controller_1 = require("../notification/notification.controller");
const getPendingDrivers = async (req, res) => {
    try {
        // Drivers with PENDING status and their vehicles
        const pendingVehicles = await vehicle_1.default.find({ status: "PENDING" }).populate("ownerId", "name email profilePhoto license aadhaar");
        res.json(pendingVehicles);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching pending drivers" });
    }
};
exports.getPendingDrivers = getPendingDrivers;
const approveDriver = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        let { status } = req.body; // APPROVED or REJECTED
        status = status?.toUpperCase();
        if (status === "REJECT")
            status = "REJECTED"; // Normalization helper
        if (!mongoose_1.default.isValidObjectId(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID format" });
        }
        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status: Must be APPROVED or REJECTED" });
        }
        const vehicle = await vehicle_1.default.findById(vehicleId);
        if (!vehicle)
            return res.status(404).json({ message: "Vehicle not found" });
        vehicle.status = status;
        await vehicle.save();
        // Update user status as well
        const user = await user_1.default.findById(vehicle.ownerId);
        if (user) {
            user.status = status === "APPROVED" ? "APPROVED" : "REJECTED";
            await user.save();
        }
        res.json({ message: `Driver ${status.toLowerCase()} successfully`, vehicle });
    }
    catch (err) {
        console.error("❌ APPROVE_DRIVER_ERROR:", err);
        res.status(500).json({ message: "Error updating driver status", error: err.message });
    }
};
exports.approveDriver = approveDriver;
const deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid driver ID" });
        }
        // Find and delete the user
        const user = await user_1.default.findByIdAndDelete(id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Delete associated vehicle if exists
        await vehicle_1.default.deleteMany({ ownerId: id });
        res.json({ message: "Driver and associated assets deleted successfully" });
    }
    catch (err) {
        console.error("Error deleting driver:", err);
        res.status(500).json({ message: "Error deleting driver" });
    }
};
exports.deleteDriver = deleteDriver;
const getAllDrivers = async (req, res) => {
    try {
        const drivers = await user_1.default.find({ role: "DRIVER", isDeleted: { $ne: true } }).select("-password");
        const vehicles = await vehicle_1.default.find();
        // Fetch report counts for each driver
        const reportCounts = await emergencyReport_1.default.aggregate([
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
    }
    catch (err) {
        console.error("Error fetching all drivers:", err);
        res.status(500).json({ message: "Error fetching drivers" });
    }
};
exports.getAllDrivers = getAllDrivers;
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await user_1.default.countDocuments({ role: "USER", isDeleted: { $ne: true } });
        const totalDrivers = await user_1.default.countDocuments({ role: "DRIVER", isDeleted: { $ne: true } });
        const pendingApprovals = await vehicle_1.default.countDocuments({ status: "PENDING" });
        const blockedUsers = await user_1.default.countDocuments({ isBlocked: true, isDeleted: { $ne: true } });
        const suspiciousUsers = await user_1.default.countDocuments({ isSuspicious: true, isDeleted: { $ne: true } });
        // Calculate Total Revenue from successful credits only
        const revenueData = await transaction_1.default.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalRevenue = revenueData[0]?.total || 0;
        // Calculate Wallet Balance (Credits - Debits)
        const creditData = await transaction_1.default.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const debitData = await transaction_1.default.aggregate([
            { $match: { type: "DEBIT", status: "SUCCESS" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const walletBalance = (creditData[0]?.total || 0) - (debitData[0]?.total || 0);
        const activeRides = await ride_1.default.countDocuments({ status: { $in: ["ACCEPTED", "ARRIVED", "STARTED", "SEARCHING", "OPEN"] } });
        const cancelledRides = await ride_1.default.countDocuments({ status: "CANCELLED" });
        const emergencyAlerts = await emergencyReport_1.default.countDocuments({ status: "PENDING" });
        // Calculate Monthly Revenue (Real aggregation)
        const fiveMonthsAgo = new Date();
        fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
        const monthlyRevenueData = await transaction_1.default.aggregate([
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
        const monthlyRevenueMap = new Map(monthlyRevenueData.map(item => [`${item._id.year}-${item._id.month}`, item.total]));
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
        const dailyRidesData = await ride_1.default.aggregate([
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
        const dailyRidesMap = new Map(dailyRidesData.map(item => {
            const key = `${item._id.month}-${item._id.day}`;
            return [key, item.count];
        }));
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
        const monthlyCreditsData = await transaction_1.default.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS", createdAt: { $gte: firstDayOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const monthlyCredits = monthlyCreditsData[0]?.total || 0;
        const prevMonthRevenueData = await transaction_1.default.aggregate([
            { $match: { type: "CREDIT", status: "SUCCESS", createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const prevMonthRevenue = prevMonthRevenueData[0]?.total || 0;
        const monthlyDebitsData = await transaction_1.default.aggregate([
            { $match: { type: "DEBIT", status: "SUCCESS", createdAt: { $gte: firstDayOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const monthlyDebits = monthlyDebitsData[0]?.total || 0;
        const currentMonthRides = await ride_1.default.countDocuments({ createdAt: { $gte: firstDayOfMonth } });
        const prevMonthRides = await ride_1.default.countDocuments({ createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } });
        const prevMonthDriversCount = await user_1.default.countDocuments({ role: "DRIVER", createdAt: { $lt: firstDayOfMonth }, isDeleted: { $ne: true } });
        const currentMonthDriversCount = await user_1.default.countDocuments({ role: "DRIVER", createdAt: { $gte: firstDayOfMonth }, isDeleted: { $ne: true } });
        const revenueTrend = prevMonthRevenue > 0 ? ((monthlyCredits - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
        const ridesTrend = prevMonthRides > 0 ? ((currentMonthRides - prevMonthRides) / prevMonthRides) * 100 : 0;
        const driversTrend = prevMonthDriversCount > 0 ? ((currentMonthDriversCount - prevMonthDriversCount) / prevMonthDriversCount) * 100 : 0;
        const totalGrowth = Number(((revenueTrend + ridesTrend + driversTrend) / 3).toFixed(1));
        const activePromotions = await discount_1.default.countDocuments({
            active: true,
            expiryDate: { $gte: new Date() }
        });
        const completedRideValueData = await ride_1.default.aggregate([
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
        const totalTransactions = await transaction_1.default.countDocuments({ status: "SUCCESS" });
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
    }
    catch (err) {
        console.error("Error fetching dashboard stats:", err);
        res.status(500).json({ message: "Error fetching stats" });
    }
};
exports.getDashboardStats = getDashboardStats;
const getAllUsers = async (req, res) => {
    try {
        const users = await user_1.default.find({ role: "USER", isDeleted: { $ne: true } }).select("-password");
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching users" });
    }
};
exports.getAllUsers = getAllUsers;
const toggleBlockUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await user_1.default.findById(id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: user.isBlocked });
    }
    catch (err) {
        res.status(500).json({ message: "Error toggling user block status" });
    }
};
exports.toggleBlockUser = toggleBlockUser;
const toggleFlagSuspicious = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await user_1.default.findById(id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        user.isSuspicious = !user.isSuspicious;
        await user.save();
        res.json({ message: `User ${user.isSuspicious ? 'flagged' : 'unflagged'} successfully`, isSuspicious: user.isSuspicious });
    }
    catch (err) {
        res.status(500).json({ message: "Error toggling user suspicious status" });
    }
};
exports.toggleFlagSuspicious = toggleFlagSuspicious;
const softDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await user_1.default.findById(id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        user.isDeleted = true;
        // Optionally anonymize data or set status to INACTIVE
        user.status = "INACTIVE";
        await user.save();
        res.json({ message: "User account deleted successfully (soft delete)" });
    }
    catch (err) {
        res.status(500).json({ message: "Error deleting user" });
    }
};
exports.softDeleteUser = softDeleteUser;
const getUserRideHistory = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const objectId = new mongoose_1.Types.ObjectId(id);
        const rides = await ride_1.default.find({
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
    }
    catch (err) {
        console.error("❌ ADMIN_RIDE_ERROR:", err);
        res.status(500).json({
            message: "❌ Internal Server Error - Ride System Failure",
            error: err.message,
            stack: err.stack
        });
    }
};
exports.getUserRideHistory = getUserRideHistory;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await user_1.default.findById(id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Update fields if they are provided
        if (updates.name)
            user.name = updates.name;
        if (updates.email)
            user.email = updates.email;
        if (updates.phone)
            user.phone = updates.phone; // phone is often in User model but check schema
        if (updates.role)
            user.role = updates.role;
        if (updates.status)
            user.status = updates.status;
        await user.save();
        res.json({ message: "User updated successfully", user });
    }
    catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ message: "Error updating user" });
    }
};
exports.updateUser = updateUser;
const getEmergencyReports = async (req, res) => {
    try {
        const reports = await emergencyReport_1.default.find()
            .populate("reporterId", "name email phone")
            .populate("driverId", "name email profilePhoto")
            .populate("rideId", "rideId driverId")
            .sort({ createdAt: -1 }); // Newest first
        res.json(reports);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching emergency reports" });
    }
};
exports.getEmergencyReports = getEmergencyReports;
const resolveEmergencyReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolutionNotes } = req.body;
        if (!["PENDING", "INVESTIGATING", "RESOLVED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const report = await emergencyReport_1.default.findByIdAndUpdate(id, { status, resolutionNotes, updatedAt: new Date() }, { new: true }).populate("reporterId", "name email").populate("driverId", "name email");
        if (!report)
            return res.status(404).json({ message: "Report not found" });
        // Send notifications if resolved or under investigation
        if (status === "RESOLVED" || status === "INVESTIGATING") {
            const title = status === "RESOLVED" ? "Emergency Report Resolved" : "Safety Report Activity";
            const message = status === "RESOLVED"
                ? `The safety report has been resolved. Action: ${resolutionNotes}`
                : "An administrator has started investigating the safety report.";
            // Notify Reporter
            if (report.reporterId) {
                const repId = report.reporterId._id?.toString() || report.reporterId.toString();
                await (0, notification_controller_1.createNotification)(repId, title, message, "SYSTEM");
                socket_1.io.to(`user:${repId}`).emit("system:alert", { title, message, type: "SYSTEM" });
            }
            // Notify Driver if linked
            if (report.driverId) {
                const drvId = report.driverId._id?.toString() || report.driverId.toString();
                await (0, notification_controller_1.createNotification)(drvId, title, message, "SYSTEM");
                socket_1.io.to(`user:${drvId}`).emit("system:alert", { title, message, type: "SYSTEM" });
            }
        }
        res.json(report);
    }
    catch (err) {
        res.status(500).json({ message: "Error resolving report" });
    }
};
exports.resolveEmergencyReport = resolveEmergencyReport;
const getDiscounts = async (req, res) => {
    try {
        const discounts = await discount_1.default.find();
        res.json(discounts);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching discounts" });
    }
};
exports.getDiscounts = getDiscounts;
const createDiscount = async (req, res) => {
    try {
        const discount = new discount_1.default(req.body);
        await discount.save();
        // Notify all users about the new discount
        const users = await user_1.default.find({ role: "USER", isDeleted: { $ne: true } }).select("_id");
        const notificationTitle = "New Discount Available! 🎁";
        const messageText = discount.type === "PERCENTAGE" ? `${discount.value}% OFF` : `₹${discount.value} FLAT OFF`;
        const notificationMessage = `Claim your ${messageText} with code: ${discount.code}. Limited time offer!`;
        // Broadcast real-time alert to all online users
        socket_1.io.to("passengers-pool").emit("system:alert", {
            title: notificationTitle,
            message: notificationMessage,
            type: "SYSTEM"
        });
        // Save persistent notifications for all users in bulk (background)
        const userIds = users.map(u => u._id.toString());
        (0, notification_controller_1.bulkCreateNotifications)(userIds, notificationTitle, notificationMessage, "SYSTEM")
            .catch(err => console.error("Error broadcast-notifying users:", err));
        res.json(discount);
    }
    catch (err) {
        res.status(500).json({ message: "Error creating discount" });
    }
};
exports.createDiscount = createDiscount;
const deleteDiscount = async (req, res) => {
    try {
        await discount_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Discount deleted" });
    }
    catch (err) {
        res.status(500).json({ message: "Error deleting discount" });
    }
};
exports.deleteDiscount = deleteDiscount;
const getAllTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const type = req.query.type;
        const query = {};
        if (type)
            query.type = type.toUpperCase();
        const totalTransactions = await transaction_1.default.countDocuments(query);
        const transactions = await transaction_1.default.find(query)
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
    }
    catch (err) {
        console.error("Error fetching transactions:", err);
        res.status(500).json({ message: "Error fetching transactions" });
    }
};
exports.getAllTransactions = getAllTransactions;
const sendNotification = async (req, res) => {
    try {
        const { targetType, targetId, title, message, type = "SYSTEM" } = req.body;
        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" });
        }
        let userIds = [];
        if (targetType === "ALL") {
            const users = await user_1.default.find({ isDeleted: { $ne: true } }).select("_id");
            userIds = users.map(u => u._id.toString());
            socket_1.io.emit("system:alert", { title, message, type });
        }
        else if (targetType === "DRIVERS") {
            const drivers = await user_1.default.find({ role: "DRIVER", isDeleted: { $ne: true } }).select("_id");
            userIds = drivers.map(d => d._id.toString());
            socket_1.io.to("drivers-pool").emit("system:alert", { title, message, type });
        }
        else if (targetType === "USERS") {
            const users = await user_1.default.find({ role: "USER", isDeleted: { $ne: true } }).select("_id");
            userIds = users.map(u => u._id.toString());
            socket_1.io.to("passengers-pool").emit("system:alert", { title, message, type });
        }
        else if (targetType === "SPECIFIC") {
            if (!targetId || !mongoose_1.default.isValidObjectId(targetId)) {
                return res.status(400).json({ message: "Invalid target ID" });
            }
            userIds = [targetId];
            socket_1.io.to(`user:${targetId}`).emit("system:alert", { title, message, type });
        }
        if (userIds.length > 0) {
            await (0, notification_controller_1.bulkCreateNotifications)(userIds, title, message, type);
        }
        res.json({ message: "Notifications sent successfully", targetCount: userIds.length });
    }
    catch (err) {
        console.error("Error sending notifications:", err);
        res.status(500).json({ message: "Error sending notifications" });
    }
};
exports.sendNotification = sendNotification;
