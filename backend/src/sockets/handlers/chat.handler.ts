import { Server, Socket } from "socket.io";

export const registerChatHandlers = (io: Server, socket: Socket) => {
    // 💬 Send specific message
    socket.on("chat:message", (data: { rideId: string; senderId: string; receiverId: string; message: string; senderName: string }) => {
        const { rideId, receiverId } = data;
        
        console.log(`💬 Chat Message: From ${data.senderName} to User ${receiverId} for Ride ${rideId}`);
        
        // Broadcast to the specifically targeted user room
        // This ensures both passenger and driver get it if they are correctly in their rooms
        io.to(`user:${receiverId}`).emit("chat:new_message", {
            ...data,
            timestamp: new Date().toISOString()
        });
        
        // Also send back to sender (to confirm delivery/update UI if not local)
        socket.emit("chat:message_sent", {
            ...data,
            timestamp: new Date().toISOString()
        });
    });

    // 🕒 Optional: Chat history could be implemented here with DB
};
