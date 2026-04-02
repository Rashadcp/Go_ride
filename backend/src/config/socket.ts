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
    setSocketDriver,
    DriverPresence
} from "../sockets/state";
import User from "../models/user";

let io: Server;

const defaultAllowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.56.1:3000",
    "http://192.168.0.103:3000"
];

const getAllowedOrigins = () => {
    const configuredOrigins = [
        process.env.FRONTEND_URL,
        process.env.ALLOWED_ORIGINS
    ]
        .filter(Boolean)
        .flatMap((value) => (value as string).split(","))
        .map((value) => value.trim())
        .filter(Boolean);

    return Array.from(new Set([...configuredOrigins, ...defaultAllowedOrigins]));
};

export const initSocket = async (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: getAllowedOrigins(),
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
            } else if (data.role === "USER") {
                socket.join("passengers-pool");
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
                const driverId = data.driverId;
                if (!driverId) return;

                // ✅ SECURITY: Verify role and approval status
                const user = await User.findById(driverId);
                // Allow both DRIVER and USER roles to go online (supports rideshare)
                // but block if the account is explicitly INACTIVE
                if (!user || (user.role !== 'DRIVER' && user.role !== 'USER') || user.status === 'INACTIVE') {
                    // Fail silently or notify if needed
                    console.warn(`[SECURITY] Unauthorized driver-online attempt: ${driverId} (${user?.name || 'Unknown'})`);
                    return;
                }

                const presence: DriverPresence = {
                    ...data,
                    driverId,
                    socketId: socket.id,
                    lastSeen: Date.now(),
                    status: "available"
                };

                // Track if this is a fresh online notification for this socket
                const isNewSession = !(socket as any).isDriverOnline;
                
                await setActiveDriver(driverId, presence);
                await setSocketDriver(socket.id, driverId);
                
                socket.join(`driver:${driverId}`);
                socket.join("drivers-pool");

                // Only log when first going online or reconnecting
                if (isNewSession) {
                    (socket as any).isDriverOnline = true;
                    const availableDrivers = await getAvailableDrivers();
                    console.log(`✅ [DRIVER ONLINE] ${data.name || driverId} (${socket.id}). Total: ${availableDrivers.length}`);
                    io.emit("active-drivers", availableDrivers);
                } else {
                    // Just broadcast the individual update instead of full list to save bandwidth
                    // Most clients only need to know who moved, not the full list every 500ms
                    io.emit("driver:location:updated", {
                        driverId,
                        location: data.location,
                        vehicleType: data.vehicleType
                    });
                }
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
