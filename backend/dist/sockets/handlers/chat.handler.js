"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatHandlers = void 0;
const normalizeUserId = (value) => {
    if (!value)
        return "";
    if (typeof value === "string")
        return value;
    if (typeof value === "object")
        return String(value._id || value.id || "");
    return String(value);
};
const registerChatHandlers = (io, socket) => {
    socket.on("chat:message", (data) => {
        const rideId = String(data.rideId || "");
        const senderId = normalizeUserId(data.senderId);
        const receiverId = normalizeUserId(data.receiverId);
        const message = data.message?.trim();
        if (!rideId || !senderId || !receiverId || !message) {
            socket.emit("chat:error", { message: "Unable to send chat message." });
            return;
        }
        const payload = {
            ...data,
            rideId,
            senderId,
            receiverId,
            message,
            timestamp: new Date().toISOString(),
        };
        console.log(`Chat Message: From ${data.senderName} to User ${receiverId} for Ride ${rideId}`);
        io.to(`user:${receiverId}`).to(`driver:${receiverId}`).emit("chat:new_message", payload);
        socket.emit("chat:message_sent", payload);
    });
};
exports.registerChatHandlers = registerChatHandlers;
