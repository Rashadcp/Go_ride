import { Request, Response } from "express";
import { Notification } from "../../models/notification";

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const notifications = await Notification.find({ userId: (req as any).user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Notification.updateOne(
            { _id: id, userId: (req as any).user.id },
            { $set: { isRead: true } }
        );
        res.json({ message: "Notification marked as read" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        await Notification.updateMany(
            { userId: (req as any).user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Notification.deleteOne({ _id: id, userId: (req as any).user.id });
        res.json({ message: "Notification deleted" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createNotification = async (userId: string, title: string, message: string, type: "INFO" | "RIDE_UPDATE" | "PAYMENT" | "SYSTEM" = "INFO") => {
    try {
        const notification = new Notification({
            userId,
            title,
            message,
            type
        });
        await notification.save();
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
        await Notification.insertMany(notifications);
    } catch (error) {
        console.error("Failed to bulk create notifications:", error);
    }
};
