import { Server } from "socket.io";
import { Server as HttpServer } from "http";

interface DriverLocation {
    driverId: string;
    socketId: string;
    location: {
        lat: number;
        lng: number;
    };
    status: "available" | "busy";
    name?: string;
    photo?: string;
    rating?: number;
}

interface PendingRideRequest {
    rideId: string;
    passengerId: string;
    candidateDriverIds: string[];
}

interface ActiveRide {
    rideId: string;
    driverId: string;
    passengerId: string;
}

// In-memory store for active drivers and active rides
const activeDrivers = new Map<string, DriverLocation>(); // key: driverId
const socketToDriver = new Map<string, string>(); // key: socketId, value: driverId
const pendingRideRequests = new Map<string, PendingRideRequest>(); // key: rideId
const activeRides = new Map<string, ActiveRide>(); // key: rideId

// Helper function to calculate distance in KM
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

export const initSocket = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        const broadcastActiveDrivers = () => {
            broadcastActiveDrivers();
        };
        console.log(`🔌 New Connection: ${socket.id}`);

        // 1. Driver Online Status
        socket.on("driver-online", (data: { 
            driverId: string; 
            location: { lat: number; lng: number };
            name?: string;
            photo?: string;
            rating?: number;
        }) => {
            const { driverId, location, name, photo, rating } = data;
            
            // Reject if no valid location
            if (!location || location.lat == null || location.lng == null) {
                console.log(`⚠️ Driver ${driverId} tried to go online without valid location, skipping.`);
                return;
            }
            
            console.log(`🚕 Driver Online: ${driverId} - ${name || 'Unknown'} at [${location.lat}, ${location.lng}]`);
            
            activeDrivers.set(driverId, {
                driverId,
                socketId: socket.id,
                location,
                status: "available",
                name,
                photo,
                rating
            });
            socketToDriver.set(socket.id, driverId);
            
            // Join a rooms for targeted messaging
            socket.join(`driver:${driverId}`);
            socket.join("drivers-pool");

            // Broadcast updated driver list to all connected passengers
            const drivers = Array.from(activeDrivers.values()).filter(d => d.status === "available" && d.location?.lat != null);
            io.emit("active-drivers", drivers);
        });

        // 2. Live Driver Location Update
        socket.on("driver-location-update", (data: { driverId: string; location: { lat: number; lng: number } }) => {
            const { driverId, location } = data;
            const driver = activeDrivers.get(driverId);
            
            if (driver && location?.lat != null && location?.lng != null) {
                driver.location = location;
                activeDrivers.set(driverId, driver);

                // Broadcast to assigned passenger if in active ride
                io.to(`ride:${driverId}`).emit("driver-location-update", { driverId, location });
            }
        });

        // 3. Active Driver Visibility for Passengers
        socket.on("get-active-drivers", () => {
            const drivers = Array.from(activeDrivers.values()).filter(d => d.status === "available" && d.location?.lat != null);
            socket.emit("active-drivers", drivers);
        });

        // 4. Ride Request (Passenger -> Server)
        socket.on("ride-request", (data: { rideId: string; passengerId: string; pickup: any; destination: any }) => {
            console.log(`🚨 New Ride Request: ${data.rideId} from ${data.passengerId}`);
            
            // Filter available drivers by proximity (e.g., within 10km)
            const nearbyDriversForRequest = Array.from(activeDrivers.values()).filter(driver => {
                if (driver.status !== "available") return false;
                const dist = getDistance(data.pickup.lat, data.pickup.lng, driver.location.lat, driver.location.lng);
                return dist <= 10; // 10km radius
            });

            console.log(`Found ${nearbyDriversForRequest.length} drivers within 10km range.`);

            pendingRideRequests.set(data.rideId, {
                rideId: data.rideId,
                passengerId: data.passengerId,
                candidateDriverIds: nearbyDriversForRequest.map((driver) => driver.driverId),
            });

            nearbyDriversForRequest.forEach(driver => {
                io.to(driver.socketId).emit("new-ride-request", data);
            });
            
            // Passenger joins their own ride room to receive updates
            socket.join(`ride-request:${data.passengerId}`);
        });

        // 6. Driver Accept or Reject
        socket.on("ride-accept", (data: { rideId: string; driverId: string; passengerId: string }) => {
            console.log(`✅ Ride Accepted by ${data.driverId} for ${data.passengerId}`);
            
            const driver = activeDrivers.get(data.driverId);
            if (driver) {
                driver.status = "busy";
                activeDrivers.set(data.driverId, driver);
            }

            pendingRideRequests.delete(data.rideId);
            activeRides.set(data.rideId, {
                rideId: data.rideId,
                driverId: data.driverId,
                passengerId: data.passengerId,
            });

            // Notify passenger specifically via their private room
            io.to(`ride-request:${data.passengerId}`).emit("ride-accepted", {
                rideId: data.rideId,
                driverId: data.driverId,
                driverInfo: driver 
            });

            // Put driver into ride-specific room for updates
            socket.join(`ride:${data.driverId}`);
            
            // The passenger already connected would listen for 'ride-accepted'
            // and should join `ride:${data.driverId}` on their client side
            broadcastActiveDrivers();
        });

        socket.on("ride-reject", (data: { rideId: string; driverId: string }) => {
            console.log(`❌ Ride Rejected by ${data.driverId}`);
            // In a real app, logic to find another driver would go here
        });

        socket.on("ride-cancel", (data: { rideId: string; passengerId: string; driverId?: string }) => {
            const pendingRequest = pendingRideRequests.get(data.rideId);

            if (pendingRequest) {
                pendingRequest.candidateDriverIds.forEach((driverId) => {
                    const driver = activeDrivers.get(driverId);
                    if (driver) {
                        io.to(driver.socketId).emit("ride-cancelled", {
                            rideId: data.rideId,
                            passengerId: data.passengerId,
                        });
                    }
                });
                pendingRideRequests.delete(data.rideId);
            }

            const activeRide = activeRides.get(data.rideId);
            if (activeRide) {
                const driver = activeDrivers.get(activeRide.driverId);
                if (driver) {
                    driver.status = "available";
                    activeDrivers.set(activeRide.driverId, driver);
                }

                io.to(`ride:${activeRide.driverId}`).emit("ride-cancelled", {
                    rideId: data.rideId,
                    passengerId: activeRide.passengerId,
                    driverId: activeRide.driverId,
                });
                io.to(`ride-request:${activeRide.passengerId}`).emit("ride-cancelled", {
                    rideId: data.rideId,
                    passengerId: activeRide.passengerId,
                    driverId: activeRide.driverId,
                });
                activeRides.delete(data.rideId);
            }

            broadcastActiveDrivers();
        });

        socket.on("join-ride", (data: { driverId: string }) => {
            socket.join(`ride:${data.driverId}`);
            console.log(`Socket ${socket.id} joined ride room ride:${data.driverId}`);
        });

        // 7. Ride Status Updates (Driver -> Server -> Passenger)
        socket.on("update-ride-status", (data: { 
            rideId: string;
            driverId: string; 
            passengerId: string; 
            status: "ACCEPTED" | "ARRIVED" | "STARTED" | "COMPLETED" | "CANCELLED";
            location?: { lat: number; lng: number };
        }) => {
            console.log(`📡 Ride Status Update: ${data.status} for driver ${data.driverId}`);
            
            // Broadcast to the ride room (both driver and passenger should be in it)
            io.to(`ride:${data.driverId}`).emit("ride-status-update", data);
            io.to(`ride-request:${data.passengerId}`).emit("ride-status-update", data);
            
            // If completed, potentially clear from activeRides or update status
            if (data.status === "COMPLETED" || data.status === "CANCELLED") {
                const driver = activeDrivers.get(data.driverId);
                if (driver) {
                    driver.status = "available";
                    activeDrivers.set(data.driverId, driver);
                }
                activeRides.delete(data.rideId);
                broadcastActiveDrivers();
            }
        });

        // 8. Connection Handling (Disconnection)
        socket.on("disconnect", () => {
            const driverId = socketToDriver.get(socket.id);
            if (driverId) {
                console.log(`🚕 Driver Offline (Disconnect): ${driverId}`);
                activeDrivers.delete(driverId);
                socketToDriver.delete(socket.id);
            }
            console.log(`🔌 Disconnected: ${socket.id}`);
        });
    });

    return io;
};
