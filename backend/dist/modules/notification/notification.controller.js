"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCreateNotifications = exports.createNotification = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const notification_1 = require("../../models/notification");
const getNotifications = async (req, res) => {
    try {
        const notifications = await notification_1.Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await notification_1.Notification.updateOne({ _id: id, userId: req.user.id }, { $set: { isRead: true } });
        res.json({ message: "Notification marked as read" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        await notification_1.Notification.updateMany({ userId: req.user.id, isRead: false }, { $set: { isRead: true } });
        res.json({ message: "All notifications marked as read" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAllAsRead = markAllAsRead;
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await notification_1.Notification.deleteOne({ _id: id, userId: req.user.id });
        res.json({ message: "Notification deleted" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteNotification = deleteNotification;
const createNotification = async (userId, title, message, type = "INFO") => {
    try {
        const notification = new notification_1.Notification({
            userId,
            title,
            message,
            type
        });
        await notification.save();
        return notification;
    }
    catch (error) {
        console.error("Failed to create notification:", error);
    }
};
exports.createNotification = createNotification;
const bulkCreateNotifications = async (userIds, title, message, type = "INFO") => {
    try {
        const notifications = userIds.map(userId => ({
            userId,
            title,
            message,
            type
        }));
        await notification_1.Notification.insertMany(notifications);
    }
    catch (error) {
        console.error("Failed to bulk create notifications:", error);
    }
};
exports.bulkCreateNotifications = bulkCreateNotifications;
