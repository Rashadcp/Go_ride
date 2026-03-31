"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const taxi_handler_1 = require("../sockets/handlers/taxi.handler");
const carpool_handler_1 = require("../sockets/handlers/carpool.handler");
const tracking_handler_1 = require("../sockets/handlers/tracking.handler");
const emergency_handler_1 = require("../sockets/handlers/emergency.handler");
const chat_handler_1 = require("../sockets/handlers/chat.handler");
const redis_1 = require("./redis");
const state_1 = require("../sockets/state");
let io;
const initSocket = async (server) => {
    exports.io = io = new socket_io_1.Server(server, {
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
    await (0, redis_1.configureSocketRedisAdapter)(io);
    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        (0, taxi_handler_1.registerTaxiHandlers)(io, socket);
        (0, carpool_handler_1.registerCarpoolHandlers)(io, socket);
        (0, tracking_handler_1.registerTrackingHandlers)(io, socket);
        (0, emergency_handler_1.registerEmergencyHandlers)(io, socket);
        (0, chat_handler_1.registerChatHandlers)(io, socket);
        socket.on("join", (data) => {
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
            else if (data.role === "USER") {
                socket.join("passengers-pool");
            }
        });
        // ✅ FIX: Respond to individual user requesting the current driver list
        socket.on("get-active-drivers", () => {
            void (async () => {
                const availableDrivers = await (0, state_1.getAvailableDrivers)();
                socket.emit("active-drivers", availableDrivers);
            })().catch((error) => {
                console.error("get-active-drivers error:", error);
            });
        });
        socket.on("driver-online", (data) => {
            void (async () => {
                const driverId = data.driverId;
                if (!driverId)
                    return;
                const presence = {
                    ...data,
                    driverId,
                    socketId: socket.id,
                    lastSeen: Date.now(),
                    status: "available"
                };
                // Track if this is a fresh online notification for this socket
                const isNewSession = !socket.isDriverOnline;
                await (0, state_1.setActiveDriver)(driverId, presence);
                await (0, state_1.setSocketDriver)(socket.id, driverId);
                socket.join(`driver:${driverId}`);
                socket.join("drivers-pool");
                // Only log when first going online or reconnecting
                if (isNewSession) {
                    socket.isDriverOnline = true;
                    const availableDrivers = await (0, state_1.getAvailableDrivers)();
                    console.log(`✅ [DRIVER ONLINE] ${data.name || driverId} (${socket.id}). Total: ${availableDrivers.length}`);
                    io.emit("active-drivers", availableDrivers);
                }
                else {
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
                const driverId = await (0, state_1.getDriverIdBySocket)(socket.id);
                if (driverId) {
                    await (0, state_1.removeActiveDriver)(driverId);
                    await (0, state_1.removeSocketDriver)(socket.id);
                    io.emit("active-drivers", await (0, state_1.getAvailableDrivers)());
                }
                console.log(`Socket disconnected: ${socket.id}`);
            })().catch((error) => {
                console.error("Disconnect cleanup failed:", error);
            });
        });
    });
    return io;
};
exports.initSocket = initSocket;
