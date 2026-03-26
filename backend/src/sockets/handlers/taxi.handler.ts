import { Server, Socket } from "socket.io";
import { activeDrivers } from "../state";
import Ride from "../../models/ride";

export const registerTaxiHandlers = (io: Server, socket: Socket) => {
    // Taxi Request
    socket.on("ride-request", async (data: any) => {
        try {
            const { pickup, destination, passengerId, requestedVehicleType, fare, rideId, isSharedRide } = data;

            // Create ride record using 'createdBy' for passengerId
            const newRide = await Ride.create({
                rideId: rideId || `RIDE-${Date.now()}`,
                createdBy: passengerId,
                type: isSharedRide ? 'CARPOOL' : 'TAXI',
                pickup: {
                    lat: pickup.lat,
                    lng: pickup.lng,
                    label: pickup.label,
                    location: { type: "Point", coordinates: [pickup.lng, pickup.lat] }
                },
                drop: {
                    lat: destination.lat,
                    lng: destination.lng,
                    label: destination.label,
                    location: { type: "Point", coordinates: [destination.lng, destination.lat] }
                },
                price: fare,
                distance: parseFloat(data.distance) || 0,
                duration: parseFloat(data.duration) || 0,
                status: 'SEARCHING',
                requestedVehicleType: requestedVehicleType === 'carpool' ? 'car' : requestedVehicleType
            });

            // Find nearby drivers
            // For TAXI, look for available drivers of specific type
            // For CARPOOL, we broadcast to the carpool logic/drivers (already handled by carpool.handler if specific)
            // But we can filter drivers who are 'available' and match vehicle type
            // Distance helper (Haversine formula)
            const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                const R = 6371; // km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            const nearbyDrivers = Array.from(activeDrivers.values()).filter(d => {
                if (!d.location?.lat || !d.location?.lng) return false;
                
                const distance = getDistance(pickup.lat, pickup.lng, d.location.lat, d.location.lng);
                const driverVehicleType = (d.vehicleType || "").toLowerCase();
                const passengerRequestedType = (requestedVehicleType || "").toLowerCase();
                
                // Only notify if within 20km AND (it's carpool OR vehicle type matches)
                const isMatch = d.status === "available" && distance <= 20 && (isSharedRide || driverVehicleType === passengerRequestedType);
                
                console.log(`   🔍 [CHECK] Driver: ${d.driverId} | Dist: ${distance.toFixed(2)}km | Status: ${d.status} | Vehicle: ${driverVehicleType} | Req: ${passengerRequestedType} | Match: ${isMatch}`);
                return isMatch;
            });

            // Notify them
            console.log(`📡 [DISPATCH] Searching for ${requestedVehicleType} drivers (Shared: ${isSharedRide})`);
            console.log(`   Active Drivers Count: ${activeDrivers.size}`);
            
            nearbyDrivers.forEach(driver => {
                console.log(`   🔔 Notifying Driver: ${driver.driverId} (Socket: ${driver.socketId})`);
                io.to(driver.socketId).emit("ride-request", {
                    rideId: newRide.rideId,
                    dbId: newRide._id,
                    passengerId,
                    passengerName: data.passengerName,
                    passengerPhoto: data.passengerPhoto,
                    pickup,
                    destination,
                    fare,
                    distance: data.distance,
                    isSharedRide
                });
            });

            // [FIX] Search for existing carpool offers matching this route to help manual intervention
            let matchingPools: any[] = [];
            if (isSharedRide) {
                const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
                matchingPools = await Ride.find({
                    type: 'CARPOOL',
                    status: 'OPEN',
                    availableSeats: { $gt: 0 },
                    createdAt: { $gte: fourHoursAgo },
                    "drop.label": destination.label
                }).populate('createdBy', 'name phone email profilePhoto rating').populate('driverId', 'name phone email profilePhoto rating').limit(1);
            }

            console.log(`-----------------------------------------`);
            console.log(`🚕 [NEW RIDE REQUESTED]`);
            console.log(`   Type: ${isSharedRide ? 'SHARED/CARPOOL' : 'PRIVATE TAXI'}`);
            console.log(`   Ride ID: ${newRide.rideId}`);
            console.log(`   Passenger: ${data.passengerName || 'Unknown'} (${passengerId})`);
            console.log(`   Pickup: ${pickup.label || 'Unknown location'}`);
            console.log(`   Destination: ${destination.label || 'Unknown location'}`);
            console.log(`   Broadcasted to ${nearbyDrivers.length} drivers`);

            if (matchingPools.length > 0) {
                console.log(`   💡 POSSIBLY MATCHING DRIVERS:`);
                const notifiedDrivers = new Set<string>();

                matchingPools.forEach(p => {
                    const driver = p.createdBy as any;
                    const driverIdStr = driver._id.toString();

                    if (notifiedDrivers.has(driverIdStr)) return;

                    console.log(`      - Pool: ${p.rideId} | Driver: ${driver?.name || 'Unknown'} | Phone: ${driver?.phone || 'N/A'}`);

                    // [FIX] Notify the carpool driver specifically via the carpool notification system
                    // This ensures the "passenger list" in their carpool interface gets updated
                    const driverSocket = activeDrivers.get(driverIdStr);
                    if (driverSocket) {
                        io.to(driverSocket.socketId).emit("carpool:join:new_request", {
                            rideId: p.rideId,
                            userId: passengerId,
                            name: data.passengerName || "A Passenger",
                            photo: data.passengerPhoto,
                            seats: data.seats || 1,
                            pickup: pickup,
                            destination: destination,
                            passengerSocketId: socket.id // Important for replying
                        });
                        console.log(`   🔔 Notified driver ${driverIdStr} of this match via Carpool system`);
                        notifiedDrivers.add(driverIdStr);
                    }
                });

                console.log(`   🔔 Notified ${notifiedDrivers.size} potential carpool driver(s) of this match`);
            }
            console.log(`-----------------------------------------`);
        } catch (error) {
            console.error("Taxi request error:", error);
            socket.emit("ride-request-failed", { reason: "Internal server error" });
        }
    });

    socket.on("cancel-ride-request", async (data: { passengerId: string }) => {
        try {
            const ride = await Ride.findOneAndUpdate(
                { createdBy: data.passengerId, status: 'SEARCHING' },
                { status: 'CANCELLED', cancelledAt: new Date() },
                { new: true }
            );
            if (ride) {
                console.log(`❌ Ride search cancelled for user ${data.passengerId}`);
            }
        } catch (error) {
            console.error("Cancel ride error:", error);
        }
    });

    socket.on("get-available-carpools", async (data: any) => {
        try {
            const { pickup, destination } = data || {};
            if (!pickup?.lat || !pickup?.lng) {
                return socket.emit("available-carpools", []);
            }

            const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
            const query: any = {
                type: 'CARPOOL',
                status: { $in: ['SEARCHING', 'OPEN', 'REQUESTED'] },
                availableSeats: { $gt: 0 },
                createdAt: { $gte: fourHoursAgo }
            };

            // If pickup provided, filter by proximity
            query["pickup.location"] = {
                $near: {
                    $geometry: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
                    $maxDistance: 50000 // 50km
                }
            };

            const pools = await Ride.find(query)
                .populate('driverId', 'name profilePhoto rating')
                .populate('createdBy', 'name profilePhoto rating')
                .limit(1);

            // Post-filtering for destination if needed
            let filteredPools = pools;
            if (destination?.lat && destination?.lng) {
                // Filter rides where destination is within 25km of requested destination
                filteredPools = pools.filter(p => {
                    const dLoc = p.drop?.location?.coordinates || [p.drop?.lng || 0, p.drop?.lat || 0];
                    if (!dLoc || dLoc[0] === 0) return true; // fallback
                    const destLng = destination?.lng ?? 0;
                    const destLat = destination?.lat ?? 0;
                    const dist = Math.sqrt(Math.pow(dLoc[0] - destLng, 2) + Math.pow(dLoc[1] - destLat, 2));
                    return dist < 0.25; // Roughly 25km
                });
            }

            console.log(`🔍 Found ${filteredPools.length}/${pools.length} carpools for query:`, JSON.stringify({ pickup, destination }));

            const enrichedPools = filteredPools.map(p => {
                const driver = p.driverId || p.createdBy;
                return {
                    ...p.toObject(),
                    driverName: (driver as any)?.name || "Driver",
                    driverPhoto: (driver as any)?.profilePhoto,
                    driverRating: (driver as any)?.rating || 4.8
                };
            });

            socket.emit("available-carpools", enrichedPools);
        } catch (error) {
            console.error("Error fetching carpools:", error);
        }
    });

    // Taxi Accept
    socket.on("ride-accept", async (data: any) => {
        try {
            const { rideId, driverId, driverInfo } = data;
            const updatedRide = await Ride.findOneAndUpdate({ rideId }, {
                driverId,
                status: 'ACCEPTED',
                acceptedAt: new Date()
            }, { new: true });

            if (!updatedRide) return;

            // Notify passenger
            io.to(`user:${updatedRide.createdBy}`).emit("ride-accepted", {
                rideId,
                driverId,
                driverInfo,
                status: 'ACCEPTED'
            });

            // Update driver status in memory
            const driver = activeDrivers.get(driverId);
            if (driver) driver.status = "busy";

            socket.join(`ride:${rideId}`);
            console.log(`-----------------------------------------`);
            console.log(`✅ [RIDE ACCEPTED BY DRIVER]`);
            console.log(`   Ride ID: ${rideId}`);
            console.log(`   Driver ID: ${driverId}`);
            console.log(`   Internal ID: ${updatedRide._id}`);
            console.log(`   Passenger ID: ${updatedRide.createdBy}`);
            console.log(`-----------------------------------------`);
        } catch (error) {
            console.error("Taxi accept error:", error);
        }
    });

    // Ride Status Update
    socket.on("update-ride-status", async (data: any) => {
        try {
            const { rideId, status, driverId, passengerId } = data;
            const updatedRide = await Ride.findOneAndUpdate({ rideId }, {
                status,
                ...(status === 'ARRIVED' ? { arrivedAt: new Date() } : {}),
                ...(status === 'STARTED' ? { startedAt: new Date() } : {}),
                ...(status === 'COMPLETED' ? { completedAt: new Date() } : {})
            }, { new: true });

            if (!updatedRide) return;

            // Broadcast to the passenger AND anyone in the ride room
            const payload = { ...data, status };
            io.to(`user:${updatedRide.createdBy}`).emit("ride-status-update", payload);
            io.to(`ride:${rideId}`).emit("ride-status-update", payload);

            // Make sure all carpool passengers are notified individually
            if (updatedRide.passengers && updatedRide.passengers.length > 0) {
                updatedRide.passengers.forEach((p: any) => {
                    io.to(`user:${p.userId}`).emit("ride-status-update", payload);
                });
            }

            if (status === 'COMPLETED') {
                const driver = activeDrivers.get(driverId);
                if (driver) driver.status = "available";
            }

            console.log(`🚕 Ride ${rideId} status updated to ${status}`);
        } catch (error) {
            console.error("Update status error:", error);
        }
    });

    // Ride Cancel
    socket.on("ride-cancel", async (data: any) => {
        try {
            const { rideId, passengerId, driverId } = data;
            const updatedRide = await Ride.findOneAndUpdate({ rideId }, {
                status: 'CANCELLED',
                cancelledAt: new Date()
            }, { new: true });

            if (!updatedRide) return;

            const recipientId = passengerId || updatedRide.createdBy;
            io.to(`user:${recipientId}`).emit("ride-cancelled", { rideId });

            if (driverId) {
                io.to(`driver:${driverId}`).emit("ride-cancelled", { rideId });
                const driver = activeDrivers.get(driverId);
                if (driver) driver.status = "available";
            }

            console.log(`❌ Ride ${rideId} cancelled`);
        } catch (error) {
            console.error("Cancel ride error:", error);
        }
    });

    // Taxi Reject (Driver declines incoming request)
    socket.on("ride-reject", async (data: { rideId: string; driverId: string }) => {
        try {
            const { rideId, driverId } = data;
            
            // Log rejection in the ride document
            const ride = await Ride.findOneAndUpdate(
                { rideId },
                { 
                    $push: { 
                        candidateDrivers: { 
                            driverId, 
                            status: "REJECTED", 
                            rejectedAt: new Date() 
                        } 
                    } 
                },
                { new: true }
            );

            if (ride) {
                console.log(`👎 [RIDE REJECTED BY DRIVER]`);
                console.log(`   Ride ID: ${rideId}`);
                console.log(`   Driver ID: ${driverId}`);
            }

            // We don't necessarily need to notify the passenger yet 
            // but we could if we wanted to show who rejected (Uber doesn't usually)
        } catch (error) {
            console.error("Taxi reject error:", error);
        }
    });
};
