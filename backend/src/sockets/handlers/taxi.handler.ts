import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import { getActiveDriver, getAvailableDrivers, updateDriverStatus } from "../state";
import Ride from "../../models/ride";
import User from "../../models/user";
import Transaction from "../../models/transaction";
import Discount from "../../models/discount";
import Vehicle from "../../models/vehicle";
import { sendBookingConfirmation } from "../../config/mail";
import { sendWhatsAppConfirmation } from "../../config/twilio";

export const registerTaxiHandlers = (io: Server, socket: Socket) => {
    // Taxi Request
    socket.on("ride-request", async (data: any) => {
        try {
            const { pickup, destination, passengerId, requestedVehicleType, fare, rideId, isSharedRide, promoCode } = data;

            let finalPrice = fare;
            let appliedDiscountId = null;

            // Optional Server side validation of discount
            if (promoCode) {
                const discount = await Discount.findOne({ code: promoCode, active: true, expiryDate: { $gt: new Date() } });
                if (discount && discount.currentUsage < discount.maxUsage) {
                    appliedDiscountId = discount._id;
                    // Note: We trust the client fare for now as it matched the UI, but we could recalculate here
                    // discount.currentUsage += 1; // Increment usage on dispatch or completion? usually dispatch
                    await Discount.findByIdAndUpdate(discount._id, { $inc: { currentUsage: 1 } });
                }
            }

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
                price: finalPrice,
                distance: parseFloat(data.distance) || 0,
                duration: parseFloat(data.duration) || 0,
                status: 'SEARCHING',
                requestedVehicleType: requestedVehicleType === 'carpool' ? 'car' : requestedVehicleType,
                paymentMethod: data.paymentMethod || 'WALLET',
                isSharedRide: isSharedRide || false,
                discountId: appliedDiscountId
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

            const nearbyDrivers = (await getAvailableDrivers()).filter(d => {
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

                for (const p of matchingPools) {
                    const driver = p.createdBy as any;
                    const driverIdStr = driver._id.toString();

                    if (notifiedDrivers.has(driverIdStr)) continue;

                    const driverSocket = await getActiveDriver(driverIdStr);
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
                }
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
                status: 'OPEN', // Only show active driver-hosted pools
                availableSeats: { $gt: 0 },
                createdAt: { $gte: fourHoursAgo }
            };

            // Exclude the current user's own carpool if they are the one searching
            // Proper ObjectId comparison is necessary for Mongoose $ne queries
            if (data.userId && mongoose.Types.ObjectId.isValid(data.userId)) {
                const hostId = new mongoose.Types.ObjectId(data.userId);
                query.driverId = { $ne: hostId };
                query.createdBy = { $ne: hostId };
            }

            query["pickup.location"] = {
                $near: {
                    $geometry: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
                    $maxDistance: 50000 // 50km
                }
            };

            const pools = await Ride.find(query)
                .populate('driverId', 'name profilePhoto rating')
                .populate('createdBy', 'name profilePhoto rating')
                .limit(10); // Show more than 1 pool!

            let filteredPools = pools;
            if (destination?.lat && destination?.lng) {
                filteredPools = pools.filter(p => {
                    const dLoc = p.drop?.location?.coordinates || [p.drop?.lng || 0, p.drop?.lat || 0];
                    if (!dLoc || dLoc[0] === 0) return true;
                    // Properly check destination distance (0.1 degree limit)
                    const dist = Math.sqrt(Math.pow(dLoc[0] - destination.lng, 2) + Math.pow(dLoc[1] - destination.lat, 2));
                    return dist < 0.25;
                });
            }

            const activePools = await Promise.all(
                filteredPools.map(async (pool) => {
                    const driverId = String((pool.driverId as any)?._id || pool.driverId || pool.createdBy?._id || pool.createdBy || "");
                    if (!driverId) return null;

                    const activeDriver = await getActiveDriver(driverId);
                    return activeDriver?.status === "available" ? pool : null;
                })
            );

            filteredPools = activePools.filter((pool): pool is NonNullable<typeof pool> => Boolean(pool));

            const enrichedPools = filteredPools.map(p => {
                const driver = p.driverId || p.createdBy;
                return {
                    ...p.toObject(),
                    driverName: (driver as any)?.name || "Available Driver",
                    driverPhoto: (driver as any)?.profilePhoto,
                    driverRating: (driver as any)?.rating || 4.8,
                    vehicleType: p.requestedVehicleType || 'car' // Ensure vehicleType is present
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
            }, { new: true }).populate('createdBy').populate('driverId');

            if (!updatedRide) return;

            // Trigger Email Booking Confirmation to Passenger
            try {
                const passenger = updatedRide.createdBy as any;
                const driver = updatedRide.driverId as any;
                console.log(`[Ride Acceptance Notice] Passenger ${passenger?.name}, Email: ${passenger?.email}, Phone: ${passenger?.phone}`);
                if (passenger && (passenger.email || passenger.phone)) {
                    const vehicle = await Vehicle.findOne({ ownerId: driver?._id });
                    const details = {
                        rideId: updatedRide.rideId,
                        pickup: updatedRide.pickup?.label || "Current Location",
                        destination: updatedRide.drop?.label || "Selected Destination",
                        fare: updatedRide.price,
                        driverName: driver?.name || "Your Driver",
                        vehicleInfo: vehicle ? `${vehicle.vehicleModel} (${vehicle.numberPlate})` : "Standard Vehicle"
                    };

                    if (passenger.email) {
                        await sendBookingConfirmation(passenger.email, details);
                    }

                    if (passenger.phone) {
                        await sendWhatsAppConfirmation(passenger.phone, details);
                    }
                }
            } catch (emailErr) {
                console.error("Booking email trigger error:", emailErr);
            }

            // ✅ Notify the accepted user
            const driver = updatedRide.driverId as any;
            const vehicle = await Vehicle.findOne({ ownerId: driver?._id });
            
            const fullDriverInfo = {
                name: driver?.name || "Driver",
                profilePhoto: driver?.profilePhoto,
                rating: driver?.rating || 4.9,
                vehicleModel: vehicle?.vehicleModel || driverInfo?.vehicleModel || "Premium Transport",
                vehiclePlate: vehicle?.numberPlate || driverInfo?.vehiclePlate || "TN 01 AB 1234",
                location: driverInfo?.location
            };

            io.to(`user:${updatedRide.createdBy._id || updatedRide.createdBy}`).emit("ride-accepted", {
                rideId,
                driverId: finalDriverId,
                driverInfo: fullDriverInfo,
                status: 'ACCEPTED',
                ride: {
                    ...updatedRide.toObject(),
                    driverId: finalDriverId,
                    driverInfo: fullDriverInfo
                }
            });

            if (finalDriverId) {
                await updateDriverStatus(finalDriverId.toString(), "busy");

                // ✅ FIX: Broadcast updated driver list to ALL users so car icons
                // disappear from every user's map when this driver goes busy
                const updatedDriverList = await getAvailableDrivers();
                io.emit("active-drivers", updatedDriverList);
            }

            // ✅ FIX: Find other SEARCHING rides (other users who requested same driver)
            // and cancel them so they don't get stuck waiting forever
            const otherStuckRides = await Ride.find({
                rideId: { $ne: rideId },
                status: 'SEARCHING',
                requestedVehicleType: updatedRide.requestedVehicleType,
                type: updatedRide.type,
                createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // within last 5 min
            });

            for (const stuckRide of otherStuckRides) {
                await Ride.findByIdAndUpdate(stuckRide._id, {
                    status: 'NO_DRIVER',
                    cancelledAt: new Date()
                });
                // Tell that user: driver was taken, please search again
                // Their handleRideRequestFailed will call resetRideState() which clears visibleNearbyDrivers
                io.to(`user:${stuckRide.createdBy}`).emit("ride-request-failed", {
                    reason: "The driver was taken by another passenger. Please search again."
                });
            }

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

            const payload = {
                ...data,
                status,
                ride: updatedRide.toObject()
            };
            io.to(`user:${updatedRide.createdBy}`).emit("ride-status-update", payload);
            io.to(`ride:${rideId}`).emit("ride-status-update", payload);

            if (updatedRide.passengers && updatedRide.passengers.length > 0) {
                updatedRide.passengers.forEach((p: any) => {
                    if (p.userId) {
                        io.to(`user:${p.userId}`).emit("ride-status-update", payload);
                    }
                });
            }

            if (status === 'COMPLETED') {
                const driverIdFromRide = updatedRide.driverId;
                const isCarpool = updatedRide.type === 'CARPOOL' || updatedRide.isSharedRide;

                const processPayment = async (pId: string, amount: number, paymentMethod: string) => {
                    const person = await User.findById(pId);
                    if (!person) return false;
                    
                    let paymentSuccessful = false;

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
                        paymentSuccessful = true;

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
                        paymentSuccessful = true;
                    } else if (paymentMethod === 'UPI') {
                        paymentSuccessful = true;
                    }

                    // ✅ Process Driver Earnings & Platform Commission
                    if (paymentSuccessful && driverIdFromRide) {
                        const driver = await User.findById(driverIdFromRide);
                        if (driver) {
                            const platformFee = Math.round(amount * 0.25); // 25% platform commission
                            let description = '';
                            let txType = 'CREDIT';
                            let txAmount = 0;

                            if (paymentMethod === 'WALLET') {
                                // Driver gets fare directly via platform, minus fee
                                const finalEarned = amount - platformFee;
                                driver.walletBalance = (driver.walletBalance || 0) + finalEarned;
                                description = `Earnings for Ride ${rideId} (Platform fee ₹${platformFee} deducted)`;
                                txType = 'CREDIT';
                                txAmount = finalEarned;
                            } else {
                                // Passenger paid driver directly (CASH/UPI)
                                // We MUST deduct the platform fee from the driver's platform wallet
                                driver.walletBalance = (driver.walletBalance || 0) - platformFee;
                                description = `Platform fee deducted for Ride ${rideId} (Paid via ${paymentMethod})`;
                                txType = 'DEBIT';
                                txAmount = platformFee;
                            }

                            await driver.save();

                            await new Transaction({
                                userId: driverIdFromRide,
                                rideId: updatedRide._id,
                                type: txType,
                                amount: txAmount,
                                description,
                                status: 'SUCCESS',
                                method: 'WALLET'
                            }).save();

                            io.to(`user:${driverIdFromRide}`).emit("wallet-update", { balance: driver.walletBalance });
                        }
                    }

                    return paymentSuccessful;
                };

                if (isCarpool) {
                    if (updatedRide.passengers && updatedRide.passengers.length > 0) {
                        for (const p of updatedRide.passengers) {
                            if (p.userId) {
                                const passengerPaymentMethod = (p as any).paymentMethod || updatedRide.paymentMethod || 'CASH';
                                const passengerAmount = (updatedRide.pricePerSeat || (updatedRide.price / updatedRide.passengers.length)) * Number((p as any).seats || 1);

                                io.to(`user:${p.userId}`).emit("ride-status-update", {
                                    rideId,
                                    status,
                                    ride: {
                                        ...updatedRide.toObject(),
                                        paymentMethod: passengerPaymentMethod
                                    }
                                });

                                await processPayment(p.userId.toString(), passengerAmount, passengerPaymentMethod);
                            }
                        }
                    }
                } else {
                    await processPayment(updatedRide.createdBy.toString(), updatedRide.price, updatedRide.paymentMethod);
                }

                const completedDriverId = driverIdFromRide?.toString();
                if (completedDriverId) {
                    await updateDriverStatus(completedDriverId, "available");
                }
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
                await updateDriverStatus(driverId, "available");
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
