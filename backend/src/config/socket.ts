import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { registerTaxiHandlers } from "../sockets/handlers/taxi.handler";
import { registerCarpoolHandlers } from "../sockets/handlers/carpool.handler";
import { registerTrackingHandlers } from "../sockets/handlers/tracking.handler";
import { registerEmergencyHandlers } from "../sockets/handlers/emergency.handler";

// In-memory store for active drivers (re-sharing with handlers if needed, but keeping here for central management)
export const activeDrivers = new Map<string, any>(); 
export const socketToDriver = new Map<string, string>();

export const initSocket = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL || "http://localhost:3000",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://192.168.56.1:3000",
                "http://192.168.0.103:3000"
            ],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log(`🔌 Modular Socket Connected: ${socket.id}`);

        // Register Shared/Modular Handlers
        registerTaxiHandlers(io, socket);
        registerCarpoolHandlers(io, socket);
        registerTrackingHandlers(io, socket);
        registerEmergencyHandlers(io, socket);

        // Global Handlers
        socket.on("join", (data: { userId: string; role: string }) => {
            console.log(`-----------------------------------------`);
            console.log(`👤 [USER JOINED]`);
            console.log(`   User ID: ${data.userId}`);
            console.log(`   Role: ${data.role}`);
            console.log(`   Socket ID: ${socket.id}`);
            console.log(`-----------------------------------------`);
            
            socket.join(data.role === "DRIVER" ? "drivers-pool" : `user:${data.userId}`);
            if (data.role === "DRIVER") {
                socket.join(`driver:${data.userId}`);
                // [FIX] Automatically mark connected drivers as active/available if they haven't sent driver-online yet
                if (!activeDrivers.has(data.userId)) {
                    activeDrivers.set(data.userId, { 
                        driverId: data.userId, 
                        socketId: socket.id, 
                        lastSeen: Date.now(), 
                        status: "available",
                        isAutoJoined: true // Mark as auto-joined to distinguish
                    });
                    socketToDriver.set(socket.id, data.userId);
                }
            }
        });

        // Driver Online/Offline (Maintain legacy for now but bridge to modular)
        socket.on("driver-online", (data: any) => {
            activeDrivers.set(data.driverId, { ...data, socketId: socket.id, lastSeen: Date.now(), status: "available" });
            socketToDriver.set(socket.id, data.driverId);
            socket.join(`driver:${data.driverId}`);
            socket.join("drivers-pool");
            
            console.log(`-----------------------------------------`);
            console.log(`🚗 [DRIVER ONLINE]`);
            console.log(`   Driver ID: ${data.driverId}`);
            console.log(`   Socket ID: ${socket.id}`);
            console.log(`   Vehicle: ${data.vehicleType || 'Not specified'}`);
            console.log(`   Total Active Drivers: ${activeDrivers.size}`);
            console.log(`-----------------------------------------`);

            io.emit("active-drivers", Array.from(activeDrivers.values()).filter(d => d.status === "available"));
        });

        socket.on("disconnect", () => {
            const driverId = socketToDriver.get(socket.id);
            if (driverId) {
                activeDrivers.delete(driverId);
                socketToDriver.delete(socket.id);
                io.emit("active-drivers", Array.from(activeDrivers.values()).filter(d => d.status === "available"));
            }
            console.log(`🔌 Disconnected: ${socket.id}`);
        });
    });

    return io;
};
