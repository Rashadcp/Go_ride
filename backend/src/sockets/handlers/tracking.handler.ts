import { Server, Socket } from "socket.io";
import Ride from "../../models/ride";
import { getActiveDriver, getAvailableDrivers, setActiveDriver } from "../state";

// Throttle how often we broadcast "active-drivers" from noisy location updates.
// Without this, we might emit too frequently and hurt performance.
const lastActiveDriversBroadcastAtByDriver = new Map<string, number>();
const ACTIVE_DRIVERS_BROADCAST_THROTTLE_MS = 5000;

export const registerTrackingHandlers = (io: Server, socket: Socket) => {
    // Live Driver Location Update (Driver -> Server -> Passenger)
    socket.on("driver:location:update", async (data: { driverId: string; location: { lat: number; lng: number } }) => {
        try {
            const { driverId, location } = data;
            
            // Broadcast location to specific ride rooms
            io.to(`track:${driverId}`).emit("driver-location-update", data); // Match front-end expectation
            io.to(`track:${driverId}`).emit("driver:location:updated", data); // Maintain modular naming too

            // Keep "active drivers" presence fresh so passenger map icons + driver lists stay accurate.
            // The passenger UI renders from the "active-drivers" event, so we must update both:
            // - the stored presence (`lastSeen` + `location`)
            // - the periodic broadcast back to clients
            const currentPresence = await getActiveDriver(driverId);
            if (currentPresence) {
                const nextPresence = {
                    ...currentPresence,
                    location,
                    lastSeen: Date.now(),
                };
                await setActiveDriver(driverId, nextPresence);

                const now = Date.now();
                const lastSentAt = lastActiveDriversBroadcastAtByDriver.get(driverId) || 0;
                if (now - lastSentAt >= ACTIVE_DRIVERS_BROADCAST_THROTTLE_MS) {
                    lastActiveDriversBroadcastAtByDriver.set(driverId, now);
                    io.emit("active-drivers", await getAvailableDrivers());
                }
            }

            // Update DB if needed (not for every heartbeat, but occasionally)
            // Existing logic does this every check - let's maintain consistency for now but follow blueprint path.
            const ride = await Ride.findOne({
                driverId,
                status: { $in: ["ACCEPTED", "ARRIVED", "STARTED"] }
            });
            if (ride) {
                ride.driverLocation = location;
                await ride.save();
            }
        } catch (error) {
            console.error("Tracking location update error:", error);
        }
    });

    // Backward-compatible event name used by some frontends (hyphen instead of colon).
    socket.on("driver-location-update", async (data: { driverId: string; location: { lat: number; lng: number } }) => {
        try {
            const { driverId, location } = data;

            io.to(`track:${driverId}`).emit("driver-location-update", data);
            io.to(`track:${driverId}`).emit("driver:location:updated", data);

            const currentPresence = await getActiveDriver(driverId);
            if (currentPresence) {
                const nextPresence = {
                    ...currentPresence,
                    location,
                    lastSeen: Date.now(),
                };
                await setActiveDriver(driverId, nextPresence);

                const now = Date.now();
                const lastSentAt = lastActiveDriversBroadcastAtByDriver.get(driverId) || 0;
                if (now - lastSentAt >= ACTIVE_DRIVERS_BROADCAST_THROTTLE_MS) {
                    lastActiveDriversBroadcastAtByDriver.set(driverId, now);
                    io.emit("active-drivers", await getAvailableDrivers());
                }
            }

            // Keep DB ride location in sync if a matching active ride exists.
            const ride = await Ride.findOne({
                driverId,
                status: { $in: ["ACCEPTED", "ARRIVED", "STARTED"] }
            });
            if (ride) {
                ride.driverLocation = location;
                await ride.save();
            }
        } catch (error) {
            console.error("Tracking location update error (driver-location-update):", error);
        }
    });

    // Handle passenger joining the tracking and status rooms for a ride
    socket.on("join-ride", (data: { driverId?: string; rideId?: string }) => {
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
