"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTrackingHandlers = void 0;
const ride_1 = __importDefault(require("../../models/ride"));
const registerTrackingHandlers = (io, socket) => {
    // Live Driver Location Update (Driver -> Server -> Passenger)
    socket.on("driver:location:update", async (data) => {
        try {
            const { driverId, location } = data;
            // Broadcast location to specific ride rooms
            io.to(`track:${driverId}`).emit("driver-location-update", data); // Match front-end expectation
            io.to(`track:${driverId}`).emit("driver:location:updated", data); // Maintain modular naming too
            // Update DB if needed (not for every heartbeat, but occasionally)
            // Existing logic does this every check - let's maintain consistency for now but follow blueprint path.
            const ride = await ride_1.default.findOne({
                driverId,
                status: { $in: ["ACCEPTED", "ARRIVED", "STARTED"] }
            });
            if (ride) {
                ride.driverLocation = location;
                await ride.save();
            }
        }
        catch (error) {
            console.error("Tracking location update error:", error);
        }
    });
    // Handle passenger joining the tracking and status rooms for a ride
    socket.on("join-ride", (data) => {
        const { driverId, rideId } = data;
        if (driverId) {
            socket.join(`track:${driverId}`);
            console.log(`👤 Socket ${socket.id} joined tracking room track:${driverId}`);
        }
        if (rideId) {
            socket.join(`ride:${rideId}`);
            console.log(`👤 Socket ${socket.id} joined status room ride:${rideId}`);
        }
    });
};
exports.registerTrackingHandlers = registerTrackingHandlers;
