import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { registerTaxiHandlers } from "../sockets/handlers/taxi.handler";
import { registerCarpoolHandlers } from "../sockets/handlers/carpool.handler";
import { registerTrackingHandlers } from "../sockets/handlers/tracking.handler";
import { registerEmergencyHandlers } from "../sockets/handlers/emergency.handler";
import { registerChatHandlers } from "../sockets/handlers/chat.handler";
import { configureSocketRedisAdapter } from "./redis";
import {
    getAvailableDrivers,
    getDriverIdBySocket,
    removeActiveDriver,
    removeSocketDriver,
    setActiveDriver,
    setSocketDriver
} from "../sockets/state";

let io: Server;

export const initSocket = async (server: HttpServer) => {
    io = new Server(server, {
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

    await configureSocketRedisAdapter(io);

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        registerTaxiHandlers(io, socket);
        registerCarpoolHandlers(io, socket);
        registerTrackingHandlers(io, socket);
        registerEmergencyHandlers(io, socket);
        registerChatHandlers(io, socket);

        socket.on("join", (data: { userId: string; role: string }) => {
            console.log("-----------------------------------------");
            console.log("[USER JOINED]");
            console.log(`   User ID: ${data.userId}`);
            console.log(`   Role: ${data.role}`);
            console.log(`   Socket ID: ${socket.id}`);
            console.log("-----------------------------------------");

            socket.join(`user:${data.userId}`);
            if (data.role === "DRIVER") {
                socket.join(`driver:${data.userId}`);
                socket.join("drivers-pool");
            }
        });

        // ✅ FIX: Respond to individual user requesting the current driver list
        socket.on("get-active-drivers", () => {
            void (async () => {
                const availableDrivers = await getAvailableDrivers();
                socket.emit("active-drivers", availableDrivers);
            })().catch((error) => {
                console.error("get-active-drivers error:", error);
            });
        });

        socket.on("driver-online", (data: any) => {
            void (async () => {
                await setActiveDriver(data.driverId, {
                    ...data,
                    driverId: data.driverId,
                    socketId: socket.id,
                    lastSeen: Date.now(),
                    status: "available"
                });
                await setSocketDriver(socket.id, data.driverId);
                socket.join(`driver:${data.driverId}`);
                socket.join("drivers-pool");

                const availableDrivers = await getAvailableDrivers();

                console.log("-----------------------------------------");
                console.log("[DRIVER ONLINE]");
                console.log(`   Driver ID: ${data.driverId}`);
                console.log(`   Socket ID: ${socket.id}`);
                console.log(`   Vehicle: ${data.vehicleType || "Not specified"}`);
                console.log(`   Total Active Drivers: ${availableDrivers.length}`);
                console.log("-----------------------------------------");

                io.emit("active-drivers", availableDrivers);
            })().catch((error) => {
                console.error("Driver online state sync failed:", error);
            });
        });

        socket.on("disconnect", () => {
            void (async () => {
                const driverId = await getDriverIdBySocket(socket.id);
                if (driverId) {
                    await removeActiveDriver(driverId);
                    await removeSocketDriver(socket.id);
                    io.emit("active-drivers", await getAvailableDrivers());
                }

                console.log(`Socket disconnected: ${socket.id}`);
            })().catch((error) => {
                console.error("Disconnect cleanup failed:", error);
            });
        });
    });

    return io;
};

export { io };
