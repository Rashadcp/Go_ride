import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import Ride from "../models/ride";
import User from "../models/user";

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

// In-memory store for active drivers only (rides now stored in DB)
const activeDrivers = new Map<string, DriverLocation>(); // key: driverId
const socketToDriver = new Map<string, string>(); // key: socketId, value: driverId

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

// Helper function to calculate ETA in minutes (simplified version)
const calculateETA = (driverLocation: { lat: number; lng: number }, pickupLocation: { lat: number; lng: number }) => {
    const distance = getDistance(driverLocation.lat, driverLocation.lng, pickupLocation.lat, pickupLocation.lng);
    // Assume average speed of 30 km/h in city traffic
    const speedKmh = 30;
    const etaHours = distance / speedKmh;
    const etaMinutes = Math.ceil(etaHours * 60);
    return Math.max(1, etaMinutes); // Minimum 1 minute
};

// Helper function to handle driver rejection and find next driver
const handleDriverRejection = async (io: Server, rideId: string, rejectedDriverId: string) => {
    try {
        const ride = await Ride.findOne({ rideId });
        if (!ride || ride.status !== "SEARCHING") return;

        // Mark this driver as rejected
        const candidateIndex = ride.candidateDrivers.findIndex(
            candidate => candidate.driverId && candidate.driverId.toString() === rejectedDriverId
        );
        if (candidateIndex !== -1) {
            ride.candidateDrivers[candidateIndex].status = "REJECTED";
            ride.candidateDrivers[candidateIndex].rejectedAt = new Date();
        }

        // Find next available driver
        const nextCandidateIndex = ride.candidateDrivers.findIndex(
            candidate => candidate.status === "PENDING"
        );

        if (nextCandidateIndex === -1) {
            // No more drivers available
            ride.status = "CANCELLED";
            await ride.save();
            io.to(`ride-request:${ride.passengerId}`).emit("ride-request-failed", {
                rideId,
                reason: "No drivers available"
            });
            return;
        }

        // Get next driver details
        const nextCandidate = ride.candidateDrivers[nextCandidateIndex];
        if (!nextCandidate.driverId) return;

        const nextDriverId = nextCandidate.driverId.toString();
        const nextDriver = activeDrivers.get(nextDriverId);

        if (!nextDriver) {
            // Driver no longer available, try next one
            await handleDriverRejection(io, rideId, nextDriverId);
            return;
        }

        // Send request to next driver
        io.to(nextDriver.socketId).emit("new-ride-request", {
            rideId,
            passengerId: ride.passengerId,
            passengerName: "", // Could populate from user data
            rideType: ride.rideType,
            requestedVehicleType: ride.requestedVehicleType,
            pickup: ride.pickup,
            destination: ride.destination,
            fare: ride.fare,
            distance: ride.distance,
            candidateIndex: nextCandidateIndex,
            totalCandidates: ride.candidateDrivers.length
        });

        await ride.save();

        // Set timeout for next driver response
        setTimeout(async () => {
            try {
                const currentRide = await Ride.findOne({ rideId });
                if (currentRide && currentRide.status === "SEARCHING") {
                    await handleDriverRejection(io, rideId, nextDriverId);
                }
            } catch (error) {
                console.error("Error in next driver response timeout:", error);
            }
        }, 30000);

    } catch (error) {
        console.error("Error handling driver rejection:", error);
    }
};

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
        socket.on("driver-location-update", async (data: { driverId: string; location: { lat: number; lng: number } }) => {
            const { driverId, location } = data;
            const driver = activeDrivers.get(driverId);
            
            if (driver && location?.lat != null && location?.lng != null) {
                driver.location = location;
                activeDrivers.set(driverId, driver);

                // Update location in database for active rides
                try {
                    const activeRide = await Ride.findOne({
                        driverId,
                        status: { $in: ["ACCEPTED", "ARRIVED", "STARTED"] }
                    });

                    if (activeRide) {
                        activeRide.driverLocation = location;

                        // Calculate and update ETA if ride is not started yet
                        if (activeRide.status === "ACCEPTED" && activeRide.pickup) {
                            const eta = calculateETA(location, activeRide.pickup);
                            activeRide.eta = eta;

                            // Emit ETA update to passenger
                            io.to(`ride:${driverId}`).emit("eta-update", { eta });
                        }

                        await activeRide.save();
                    }
                } catch (error) {
                    console.error("Error updating driver location in DB:", error);
                }

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
        socket.on("ride-request", async (data: {
            rideId: string;
            passengerId: string;
            passengerName?: string;
            rideType?: string;
            requestedVehicleType?: string;
            pickup: any;
            destination: any;
            fare: number;
            distance: number;
        }) => {
            try {
                console.log(`🚨 New Ride Request: ${data.rideId} from ${data.passengerId}`);

                // Filter available drivers by proximity (e.g., within 10km)
                const nearbyDriversForRequest = Array.from(activeDrivers.values()).filter(driver => {
                    if (driver.status !== "available") return false;
                    const dist = getDistance(data.pickup.lat, data.pickup.lng, driver.location.lat, driver.location.lng);
                    return dist <= 10; // 10km radius
                });

                console.log(`Found ${nearbyDriversForRequest.length} drivers within 10km range.`);

                if (nearbyDriversForRequest.length === 0) {
                    io.to(`ride-request:${data.passengerId}`).emit("ride-request-failed", {
                        rideId: data.rideId,
                        reason: "No drivers available nearby"
                    });
                    return;
                }

                // Create ride in database
                const ride = new Ride({
                    rideId: data.rideId,
                    passengerId: data.passengerId,
                    status: "SEARCHING",
                    pickup: data.pickup,
                    destination: data.destination,
                    rideType: data.rideType || "taxi",
                    requestedVehicleType: data.requestedVehicleType || "car",
                    fare: data.fare,
                    distance: data.distance,
                    duration: 0, // Will be calculated
                    candidateDrivers: nearbyDriversForRequest.map(driver => ({
                        driverId: driver.driverId,
                        status: "PENDING"
                    }))
                });

                await ride.save();

                // Send request to first available driver
                const firstDriver = nearbyDriversForRequest[0];
                io.to(firstDriver.socketId).emit("new-ride-request", {
                    ...data,
                    candidateIndex: 0,
                    totalCandidates: nearbyDriversForRequest.length
                });

                // Set timeout for driver response (30 seconds)
                setTimeout(async () => {
                    try {
                        const currentRide = await Ride.findOne({ rideId: data.rideId });
                        if (currentRide && currentRide.status === "SEARCHING") {
                            // Driver didn't respond, mark as rejected and try next driver
                            await handleDriverRejection(io, data.rideId, firstDriver.driverId);
                        }
                    } catch (error) {
                        console.error("Error in driver response timeout:", error);
                    }
                }, 30000);

                // Passenger joins their own ride room to receive updates
                socket.join(`ride-request:${data.passengerId}`);
            } catch (error) {
                console.error("Error processing ride request:", error);
                io.to(`ride-request:${data.passengerId}`).emit("ride-request-failed", {
                    rideId: data.rideId,
                    reason: "Failed to process ride request"
                });
            }
        });

        // 6. Driver Accept or Reject
        socket.on("ride-accept", async (data: { rideId: string; driverId: string; passengerId: string }) => {
            try {
                console.log(`✅ Ride Accepted by ${data.driverId} for ${data.passengerId}`);

                const ride = await Ride.findOne({ rideId: data.rideId });
                if (!ride || ride.status !== "SEARCHING") {
                    console.log(`Ride ${data.rideId} not found or not in searching state`);
                    return;
                }

                const driver = activeDrivers.get(data.driverId);
                if (!driver) {
                    console.log(`Driver ${data.driverId} not found in active drivers`);
                    return;
                }

                // Update driver status
                driver.status = "busy";
                activeDrivers.set(data.driverId, driver);

                // Update ride in database
                ride.driverId = data.driverId as any; // Cast to any to handle ObjectId
                ride.status = "ACCEPTED";
                ride.acceptedAt = new Date();

                // Mark accepting driver as accepted
                const candidateIndex = ride.candidateDrivers.findIndex(
                    candidate => candidate.driverId && candidate.driverId.toString() === data.driverId
                );
                if (candidateIndex !== -1) {
                    ride.candidateDrivers[candidateIndex].status = "ACCEPTED";
                }

                await ride.save();

                // Notify passenger specifically via their private room
                io.to(`ride-request:${data.passengerId}`).emit("ride-accepted", {
                    rideId: data.rideId,
                    driverId: data.driverId,
                    driverInfo: driver,
                    ride: ride
                });

                // Put driver into ride-specific room for updates
                socket.join(`ride:${data.driverId}`);

                // Calculate initial ETA
                if (ride.pickup) {
                    const eta = calculateETA(driver.location, ride.pickup);
                    ride.eta = eta;
                    await ride.save();

                    // Emit ETA update
                    io.to(`ride:${data.driverId}`).emit("eta-update", { eta });
                }

                broadcastActiveDrivers();
            } catch (error) {
                console.error("Error accepting ride:", error);
            }
        });

        socket.on("ride-reject", async (data: { rideId: string; driverId: string }) => {
            try {
                console.log(`❌ Ride Rejected by ${data.driverId}`);
                await handleDriverRejection(io, data.rideId, data.driverId);
            } catch (error) {
                console.error("Error rejecting ride:", error);
            }
        });

        socket.on("ride-cancel", async (data: { rideId: string; passengerId: string; driverId?: string }) => {
            try {
                const ride = await Ride.findOne({ rideId: data.rideId });
                if (!ride) return;

                ride.status = "CANCELLED";
                ride.cancelledAt = new Date();
                await ride.save();

                // If there's an assigned driver, free them up
                if (ride.driverId) {
                    const driver = activeDrivers.get(ride.driverId.toString());
                    if (driver) {
                        driver.status = "available";
                        activeDrivers.set(ride.driverId.toString(), driver);
                    }
                }

                // Notify both passenger and driver
                io.to(`ride-request:${ride.passengerId}`).emit("ride-cancelled", {
                    rideId: data.rideId,
                    passengerId: ride.passengerId,
                    driverId: ride.driverId,
                });

                if (ride.driverId) {
                    io.to(`ride:${ride.driverId}`).emit("ride-cancelled", {
                        rideId: data.rideId,
                        passengerId: ride.passengerId,
                        driverId: ride.driverId,
                    });
                }

                broadcastActiveDrivers();
            } catch (error) {
                console.error("Error cancelling ride:", error);
            }
        });

        socket.on("join-ride", (data: { driverId: string }) => {
            socket.join(`ride:${data.driverId}`);
            console.log(`Socket ${socket.id} joined ride room ride:${data.driverId}`);
        });

        // 7. Ride Status Updates (Driver -> Server -> Passenger)
        socket.on("update-ride-status", async (data: { 
            rideId: string;
            driverId: string; 
            passengerId: string; 
            status: "ACCEPTED" | "ARRIVED" | "STARTED" | "COMPLETED" | "CANCELLED";
            location?: { lat: number; lng: number };
        }) => {
            try {
                console.log(`📡 Ride Status Update: ${data.status} for driver ${data.driverId}`);
                
                const ride = await Ride.findOne({ rideId: data.rideId });
                if (!ride) return;

                ride.status = data.status;

                // Set timestamps based on status
                if (data.status === "STARTED") ride.startedAt = new Date();
                if (data.status === "COMPLETED") ride.completedAt = new Date();
                if (data.status === "CANCELLED") ride.cancelledAt = new Date();

                // Update driver location if provided
                if (data.location) {
                    ride.driverLocation = data.location;
                }

                await ride.save();

                // Broadcast to the ride room (both driver and passenger should be in it)
                io.to(`ride:${data.driverId}`).emit("ride-status-update", data);
                io.to(`ride-request:${data.passengerId}`).emit("ride-status-update", data);
                
                // If completed or cancelled, free up the driver
                if (data.status === "COMPLETED" || data.status === "CANCELLED") {
                    const driver = activeDrivers.get(data.driverId);
                    if (driver) {
                        driver.status = "available";
                        activeDrivers.set(data.driverId, driver);
                    }
                    broadcastActiveDrivers();
                }
            } catch (error) {
                console.error("Error updating ride status:", error);
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
