import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import mongoose, { Types } from "mongoose";
import User from "../auth/user.model";
import Vehicle from "../vehicle/vehicle.model";
import Transaction from "../payment/transaction.model";
import EmergencyReport from "../emergency/emergencyReport.model";
import Discount from "../ride/discount.model";
import Ride from "../ride/ride.model";
import { io } from "../../config/socket";
import { createNotification, bulkCreateNotifications } from "../notification/notification.controller";
import { emitDriverApprovalStatusChanged } from "./admin.events";

const throwHttpError = (res: Response, status: number, message: string): never => {
    res.status(status);
    throw new Error(message);
};

export const getPendingDrivers = asyncHandler(async (_req: Request, res: Response) => {
    const pendingVehicles = await Vehicle.find({ status: "PENDING" }).populate("ownerId", "name email profilePhoto license aadhaar");
    res.json(pendingVehicles);
});

export const approveDriver = asyncHandler(async (req: Request, res: Response) => {
    const { vehicleId } = req.params as any;
    let { status } = req.body;
    status = status?.toUpperCase();

    if (status === "REJECT") status = "REJECTED";

    if (!mongoose.isValidObjectId(vehicleId)) {
        throwHttpError(res, 400, "Invalid vehicle ID format");
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
        throwHttpError(res, 400, "Invalid status: Must be APPROVED or REJECTED");
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        throwHttpError(res, 404, "Vehicle not found");
    }
    const vehicleDoc = vehicle as NonNullable<typeof vehicle>;

    const previousStatus = vehicleDoc.status;
    vehicleDoc.status = status;
    await vehicleDoc.save();

    const user = await User.findById(vehicleDoc.ownerId);
    if (user) {
        user.status = status === "APPROVED" ? "APPROVED" : "REJECTED";
        await user.save();

        if (previousStatus !== status) {
            emitDriverApprovalStatusChanged({
                userId: user._id.toString(),
                vehicleId: vehicleDoc._id.toString(),
                driverName: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Driver",
                email: user.email || undefined,
                status
            });
        }
    }

    res.json({ message: `Driver ${status.toLowerCase()} successfully`, vehicle: vehicleDoc });
});

export const deleteDriver = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        throwHttpError(res, 400, "Invalid driver ID");
    }

    const user = await User.findByIdAndDelete(id as string);
    if (!user) {
        throwHttpError(res, 404, "User not found");
    }

    await Vehicle.deleteMany({ ownerId: id });
    res.json({ message: "Driver and associated assets deleted successfully" });
});

export const getAllDrivers = asyncHandler(async (_req: Request, res: Response) => {
    const drivers = await User.find({ role: "DRIVER", isDeleted: { $ne: true } }).select("-password");
    const vehicles = await Vehicle.find();
    const reportCounts = await EmergencyReport.aggregate([
        { $group: { _id: "$driverId", count: { $sum: 1 } } }
    ]);

    const driversWithVehicles = drivers.map((driver) => {
        const vehicle = vehicles.find((v) => v.ownerId && v.ownerId.toString() === driver._id.toString());
        const reports = reportCounts.find((r) => r._id && r._id.toString() === driver._id.toString());

        return {
            ...driver.toObject(),
            vehicle: vehicle || null,
            reportCount: reports ? reports.count : 0
        };
    });

    res.json(driversWithVehicles);
});

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
    const totalUsers = await User.countDocuments({ role: "USER", isDeleted: { $ne: true } });
    const totalDrivers = await User.countDocuments({ role: "DRIVER", isDeleted: { $ne: true } });
    const pendingApprovals = await Vehicle.countDocuments({ status: "PENDING" });
    const blockedUsers = await User.countDocuments({ isBlocked: true, isDeleted: { $ne: true } });
    const suspiciousUsers = await User.countDocuments({ isSuspicious: true, isDeleted: { $ne: true } });

    const revenueData = await Transaction.aggregate([
        { $match: { type: "CREDIT", status: "SUCCESS" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

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
        monthlyRevenueData.map((item) => [`${item._id.year}-${item._id.month}`, item.total])
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
        dailyRidesData.map((item) => [`${item._id.month}-${item._id.day}`, item.count])
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
});

export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
    const users = await User.find({ role: "USER", isDeleted: { $ne: true } }).select("-password");
    res.json(users);
});

export const toggleBlockUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
        throwHttpError(res, 400, "Invalid user ID");
    }

    const user = await User.findById(id as string);
    if (!user) {
        throwHttpError(res, 404, "User not found");
    }
    const userDoc = user as NonNullable<typeof user>;

    userDoc.isBlocked = !userDoc.isBlocked;
    await userDoc.save();

    res.json({ message: `User ${userDoc.isBlocked ? "blocked" : "unblocked"} successfully`, isBlocked: userDoc.isBlocked });
});

export const toggleFlagSuspicious = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
        throwHttpError(res, 400, "Invalid user ID");
    }

    const user = await User.findById(id as string);
    if (!user) {
        throwHttpError(res, 404, "User not found");
    }
    const userDoc = user as NonNullable<typeof user>;

    userDoc.isSuspicious = !userDoc.isSuspicious;
    await userDoc.save();

    res.json({ message: `User ${userDoc.isSuspicious ? "flagged" : "unflagged"} successfully`, isSuspicious: userDoc.isSuspicious });
});

export const softDeleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
        throwHttpError(res, 400, "Invalid user ID");
    }

    const user = await User.findById(id as string);
    if (!user) {
        throwHttpError(res, 404, "User not found");
    }
    const userDoc = user as NonNullable<typeof user>;

    userDoc.isDeleted = true;
    userDoc.status = "INACTIVE";
    await userDoc.save();

    res.json({ message: "User account deleted successfully (soft delete)" });
});

export const getUserRideHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
        throwHttpError(res, 400, "Invalid user ID");
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
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.isValidObjectId(id)) {
        throwHttpError(res, 400, "Invalid user ID");
    }

    const user = await User.findById(id as string);
    if (!user) {
        throwHttpError(res, 404, "User not found");
    }
    const userDoc = user as NonNullable<typeof user>;

    if (updates.name) userDoc.name = updates.name;
    if (updates.email) userDoc.email = updates.email;
    if (updates.phone) (userDoc as any).phone = updates.phone;
    if (updates.role) userDoc.role = updates.role;
    if (updates.status) userDoc.status = updates.status;

    await userDoc.save();
    res.json({ message: "User updated successfully", user: userDoc });
});

export const getEmergencyReports = asyncHandler(async (_req: Request, res: Response) => {
    const reports = await EmergencyReport.find()
        .populate("reporterId", "name email phone")
        .populate("driverId", "name email profilePhoto")
        .populate("rideId", "rideId driverId")
        .sort({ createdAt: -1 });
    res.json(reports);
});

export const resolveEmergencyReport = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    if (!["PENDING", "INVESTIGATING", "RESOLVED"].includes(status)) {
        throwHttpError(res, 400, "Invalid status");
    }

    const report = await EmergencyReport.findByIdAndUpdate(
        id,
        { status, resolutionNotes, updatedAt: new Date() },
        { new: true }
    ).populate("reporterId", "name email").populate("driverId", "name email");

    if (!report) {
        throwHttpError(res, 404, "Report not found");
    }
    const reportDoc = report as NonNullable<typeof report>;

    if (status === "RESOLVED" || status === "INVESTIGATING") {
        const title = status === "RESOLVED" ? "Emergency Report Resolved" : "Safety Report Activity";
        const message = status === "RESOLVED"
            ? `The safety report has been resolved. Action: ${resolutionNotes}`
            : "An administrator has started investigating the safety report.";

        if (reportDoc.reporterId) {
            const repId = (reportDoc.reporterId as any)._id?.toString() || reportDoc.reporterId.toString();
            await createNotification(repId, title, message, "SYSTEM");
            io.to(`user:${repId}`).emit("system:alert", { title, message, type: "SYSTEM" });
        }

        if (reportDoc.driverId) {
            const drvId = (reportDoc.driverId as any)._id?.toString() || reportDoc.driverId.toString();
            await createNotification(drvId, title, message, "SYSTEM");
            io.to(`user:${drvId}`).emit("system:alert", { title, message, type: "SYSTEM" });
        }
    }

    res.json(reportDoc);
});

export const getDiscounts = asyncHandler(async (_req: Request, res: Response) => {
    const discounts = await Discount.find();
    res.json(discounts);
});

export const createDiscount = asyncHandler(async (req: Request, res: Response) => {
    const discount = new Discount(req.body);
    await discount.save();

    const users = await User.find({ role: "USER", isDeleted: { $ne: true } }).select("_id");
    const notificationTitle = "New Discount Available!";
    const messageText = discount.type === "PERCENTAGE" ? `${discount.value}% OFF` : `Rs${discount.value} FLAT OFF`;
    const notificationMessage = `Claim your ${messageText} with code: ${discount.code}. Limited time offer!`;

    io.to("passengers-pool").emit("system:alert", {
        title: notificationTitle,
        message: notificationMessage,
        type: "SYSTEM"
    });

    const userIds = users.map((user) => user._id.toString());
    bulkCreateNotifications(userIds, notificationTitle, notificationMessage, "SYSTEM")
        .catch((err) => console.error("Error broadcast-notifying users:", err));

    res.json(discount);
});

export const deleteDiscount = asyncHandler(async (req: Request, res: Response) => {
    await Discount.findByIdAndDelete(req.params.id);
    res.json({ message: "Discount deleted" });
});

export const getAllTransactions = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const type = req.query.type as string;
    const status = req.query.status as string;
    const method = req.query.method as string;
    const search = (req.query.search as string)?.trim();
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const query: any = {};

    if (type && type !== "ALL") query.type = type.toUpperCase();
    if (status && status !== "ALL") query.status = status.toUpperCase();
    if (method && method !== "ALL") query.method = method.toUpperCase();

    if (dateFrom || dateTo) {
        query.createdAt = {};

        if (dateFrom) {
            const start = new Date(dateFrom);
            start.setHours(0, 0, 0, 0);
            query.createdAt.$gte = start;
        }

        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    if (search) {
        const searchRegex = new RegExp(search, "i");
        const matchingUsers = await User.find({
            $or: [{ name: searchRegex }, { email: searchRegex }]
        }).select("_id");

        query.$or = [{ description: searchRegex }];
        if (matchingUsers.length > 0) {
            query.$or.push({ userId: { $in: matchingUsers.map((user) => user._id) } });
        }
    }

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
});

export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
    const { targetType, targetId, title, message, type = "SYSTEM" } = req.body;

    if (!title || !message) {
        throwHttpError(res, 400, "Title and message are required");
    }

    let userIds: string[] = [];

    if (targetType === "ALL") {
        const users = await User.find({ isDeleted: { $ne: true } }).select("_id");
        userIds = users.map((user) => user._id.toString());
        io.emit("system:alert", { title, message, type });
    } else if (targetType === "DRIVERS") {
        const drivers = await User.find({ role: "DRIVER", isDeleted: { $ne: true } }).select("_id");
        userIds = drivers.map((driver) => driver._id.toString());
        io.to("drivers-pool").emit("system:alert", { title, message, type });
    } else if (targetType === "USERS") {
        const users = await User.find({ role: "USER", isDeleted: { $ne: true } }).select("_id");
        userIds = users.map((user) => user._id.toString());
        io.to("passengers-pool").emit("system:alert", { title, message, type });
    } else if (targetType === "SPECIFIC") {
        if (!targetId || !mongoose.isValidObjectId(targetId)) {
            throwHttpError(res, 400, "Invalid target ID");
        }
        userIds = [targetId];
        io.to(`user:${targetId}`).emit("system:alert", { title, message, type });
    }

    if (userIds.length > 0) {
        await bulkCreateNotifications(userIds, title, message, type);
    }

    res.json({ message: "Notifications sent successfully", targetCount: userIds.length });
});
