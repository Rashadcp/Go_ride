import { Server, Socket } from "socket.io";
import { activeDrivers } from "../state";
import Ride from "../../models/ride";
import User from "../../models/user";
import Transaction from "../../models/transaction";

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
                requestedVehicleType: requestedVehicleType === 'carpool' ? 'car' : requestedVehicleType,
                paymentMethod: data.paymentMethod || 'WALLET'
            });

            // Find nearby drivers
            // For TAXI, look for available drivers of specific type
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
                const isMatch = d.status === "available" && distance <= 20 && 
                    (isSharedRide ? d.isCarpool === true : (driverVehicleType === passengerRequestedType && !d.isCarpool));

                return isMatch;
            });

            // Notify them
            console.log(`📡 [DISPATCH] Searching for ${requestedVehicleType} drivers (Shared: ${isSharedRide})`);
            
            nearbyDrivers.forEach(driver => {
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

            if (matchingPools.length > 0) {
                const notifiedDrivers = new Set<string>();

                matchingPools.forEach(p => {
                    const driver = p.createdBy as any;
                    const driverIdStr = driver._id.toString();

                    if (notifiedDrivers.has(driverIdStr)) return;

                    const driverSocket = activeDrivers.get(driverIdStr);
                    if (driverSocket) {
                        io.to(driverSocket.socketId).emit("carpool:join:new_request", {
                            rideId: p.rideId,
                            userId: passengerId,
                            name: data.passengerName || "A Passenger",
                            passengerPhoto: data.passengerPhoto,
                            seats: data.seats || 1,
                            pickup: pickup,
                            destination: destination,
                            passengerSocketId: socket.id
                        });
                        notifiedDrivers.add(driverIdStr);
                    }
                });
            }
        } catch (error) {
            console.error("Taxi request error:", error);
            socket.emit("ride-request-failed", { reason: "Internal server error" });
        }
    });

    socket.on("cancel-ride-request", async (data: { passengerId: string }) => {
        try {
            await Ride.findOneAndUpdate(
                { createdBy: data.passengerId, status: 'SEARCHING' },
                { status: 'CANCELLED', cancelledAt: new Date() },
                { new: true }
            );
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

            let filteredPools = pools;
            if (destination?.lat && destination?.lng) {
                filteredPools = pools.filter(p => {
                    const dLoc = p.drop?.location?.coordinates || [p.drop?.lng || 0, p.drop?.lat || 0];
                    if (!dLoc || dLoc[0] === 0) return true;
                    const dist = Math.sqrt(Math.pow(dLoc[0] - destination.lng, 2) + Math.pow(dLoc[1] - destination.lat, 2));
                    return dist < 0.25;
                });
            }

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

    socket.on("ride-accept", async (data: any) => {
        try {
            const { rideId, driverId, driverInfo } = data;
            const finalDriverId = driverId || socket.data.user?.id || socket.data.user?._id;
            
            const updatedRide = await Ride.findOneAndUpdate({ rideId }, {
                driverId: finalDriverId,
                status: 'ACCEPTED',
                acceptedAt: new Date()
            }, { new: true });

            if (!updatedRide) return;

            io.to(`user:${updatedRide.createdBy}`).emit("ride-accepted", {
                rideId,
                driverId,
                driverInfo,
                status: 'ACCEPTED'
            });

            const driver = activeDrivers.get(driverId);
            if (driver) driver.status = "busy";

            socket.join(`ride:${rideId}`);
        } catch (error) {
            console.error("Taxi accept error:", error);
        }
    });

    socket.on("update-ride-status", async (data: any) => {
        try {
            const { rideId, status, driverId } = data;
            const updatedRide = await Ride.findOneAndUpdate({ rideId }, {
                status,
                ...(status === 'ARRIVED' ? { arrivedAt: new Date() } : {}),
                ...(status === 'STARTED' ? { startedAt: new Date() } : {}),
                ...(status === 'COMPLETED' ? { completedAt: new Date() } : {})
            }, { new: true });

            if (!updatedRide) return;

            const payload = { ...data, status };
            io.to(`user:${updatedRide.createdBy}`).emit("ride-status-update", payload);
            io.to(`ride:${rideId}`).emit("ride-status-update", payload);

            if (updatedRide.passengers && updatedRide.passengers.length > 0) {
                updatedRide.passengers.forEach((p: any) => {
                    io.to(`user:${p.userId}`).emit("ride-status-update", payload);
                });
            }

            if (status === 'COMPLETED') {
                const driverIdFromRide = updatedRide.driverId;
                const paymentMethod = updatedRide.paymentMethod;
                const isCarpool = updatedRide.type === 'CARPOOL' || updatedRide.isSharedRide;

                const processPayment = async (pId: string, amount: number) => {
                    const person = await User.findById(pId);
                    if (!person) return false;
                    
                    if (paymentMethod === 'WALLET') {
                        if ((person.walletBalance || 0) < amount) {
                            io.to(`user:${pId}`).emit("ride-request-failed", { reason: "Insufficient wallet balance to complete payment." });
                            return false;
                        }
                        person.walletBalance -= amount;
                        await person.save();
                        
                        await new Transaction({
                            userId: pId,
                            rideId: updatedRide._id,
                            type: 'DEBIT',
                            amount: amount,
                            description: `Payment for Ride ${rideId}`,
                            status: 'SUCCESS',
                            method: 'WALLET'
                        }).save();

                        io.to(`user:${pId}`).emit("wallet-update", { balance: person.walletBalance });

                        if (driverIdFromRide) {
                            const driver = await User.findById(driverIdFromRide);
                            if (driver) {
                                const finalEarned = Math.round(amount * 0.85); // 15% platform fee
                                driver.walletBalance = (driver.walletBalance || 0) + finalEarned;
                                await driver.save();

                                await new Transaction({
                                    userId: driverIdFromRide,
                                    rideId: updatedRide._id,
                                    type: 'CREDIT',
                                    amount: finalEarned,
                                    description: `Earnings for Ride ${rideId} (from passenger payment)`,
                                    status: 'SUCCESS',
                                    method: 'WALLET'
                                }).save();

                                io.to(`user:${driverIdFromRide}`).emit("wallet-update", { balance: driver.walletBalance });
                            }
                        }
                        return true;
                    } else if (paymentMethod === 'CASH') {
                        await new Transaction({
                            userId: pId,
                            rideId: updatedRide._id,
                            type: 'DEBIT',
                            amount: amount,
                            description: `Cash payment for Ride ${rideId}`,
                            status: 'SUCCESS',
                            method: 'CASH'
                        }).save();
                        return true;
                    }
                    return false;
                };

                if (isCarpool) {
                    if (updatedRide.passengers && updatedRide.passengers.length > 0) {
                        for (const p of updatedRide.passengers) {
                            await processPayment(p.userId.toString(), updatedRide.pricePerSeat || (updatedRide.price / updatedRide.passengers.length));
                        }
                    }
                } else {
                    await processPayment(updatedRide.createdBy.toString(), updatedRide.price);
                }

                const d = activeDrivers.get(driverIdFromRide?.toString() || "");
                if (d) d.status = "available";
            }
        } catch (error) {
            console.error("Update status error:", error);
        }
    });

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
        } catch (error) {
            console.error("Cancel ride error:", error);
        }
    });

    socket.on("ride-reject", async (data: { rideId: string; driverId: string }) => {
        try {
            const { rideId, driverId } = data;
            await Ride.findOneAndUpdate(
                { rideId },
                { $push: { candidateDrivers: { driverId, status: "REJECTED", rejectedAt: new Date() } } },
                { new: true }
            );
        } catch (error) {
            console.error("Taxi reject error:", error);
        }
    });
};
