import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Notification } from "./notification.model";
import User from "../auth/user.model";
import { io } from "../../config/socket";

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const notifications = await Notification.find({ userId: (req as any).user.id })
        .sort({ createdAt: -1 })
        .limit(50);
    res.json(notifications);
});

const emitRealtimeNotification = (notification: any) => {
    io?.to(`user:${notification.userId.toString()}`).emit("notification:new", notification);
};

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await Notification.updateOne(
        { _id: id, userId: (req as any).user.id },
        { $set: { isRead: true } }
    );
    res.json({ message: "Notification marked as read" });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    await Notification.updateMany(
        { userId: (req as any).user.id, isRead: false },
        { $set: { isRead: true } }
    );
    res.json({ message: "All notifications marked as read" });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await Notification.deleteOne({ _id: id, userId: (req as any).user.id });
    res.json({ message: "Notification deleted" });
});

export const createNotification = async (userId: string, title: string, message: string, type: "INFO" | "RIDE_UPDATE" | "PAYMENT" | "SYSTEM" = "INFO") => {
    try {
        const notification = new Notification({
            userId,
            title,
            message,
            type
        });
        await notification.save();
        emitRealtimeNotification(notification);
        return notification;
    } catch (error) {
        console.error("Failed to create notification:", error);
    }
};

export const bulkCreateNotifications = async (userIds: string[], title: string, message: string, type: "INFO" | "RIDE_UPDATE" | "PAYMENT" | "SYSTEM" = "INFO") => {
    try {
        const notifications = userIds.map(userId => ({
            userId,
            title,
            message,
            type
        }));

        if (notifications.length === 0) {
            return [];
        }

        const createdNotifications = await Notification.insertMany(notifications);
        createdNotifications.forEach((notification) => {
            emitRealtimeNotification(notification);
        });

        return createdNotifications;
    } catch (error) {
        console.error("Failed to bulk create notifications:", error);
        return [];
    }
};

export const createNotificationsForRole = async (
    role: "USER" | "DRIVER" | "ADMIN",
    title: string,
    message: string,
    type: "INFO" | "RIDE_UPDATE" | "PAYMENT" | "SYSTEM" = "INFO"
) => {
    try {
        const users = await User.find({ role, isDeleted: { $ne: true } }).select("_id");
        const userIds = users.map((user) => user._id.toString());
        return bulkCreateNotifications(userIds, title, message, type);
    } catch (error) {
        console.error(`Failed to create ${role} notifications:`, error);
        return [];
    }
};
