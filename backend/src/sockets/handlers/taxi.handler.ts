import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import { getActiveDriver, getAvailableDrivers, updateDriverStatus } from "../state";
import Ride from "../../modules/ride/ride.model";
import User from "../../modules/auth/user.model";
import Transaction from "../../modules/payment/transaction.model";
import Discount from "../../modules/ride/discount.model";
import Vehicle from "../../modules/vehicle/vehicle.model";
import { sendBookingConfirmation } from "../../config/mail";
import { sendWhatsAppConfirmation } from "../../config/twilio";
import { calculateDiscountedAmount, calculateRideQuote } from "../../common/utils/fare-engine";
import {
    createPendingTaxiRideRequest,
    expirePendingRideRequests,
    getEligibleOnlineDriversForRide,
    markRideRequestsBroadcastedToDriver,
    rideRequestToDriverPayload
} from "../../modules/taxi/taxi.service";

const getDisplayName = (user: any, fallback = "Driver") => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return user?.name || fullName || fallback;
};

const buildDriverInfo = (driver: any, vehicle: any, fallbackInfo: any = {}) => {
    const vehiclePlate = vehicle?.numberPlate || fallbackInfo?.vehiclePlate || fallbackInfo?.vehicleNumber || "TN 01 AB 1234";

    return {
        ...(fallbackInfo || {}),
        driverId: driver?._id || fallbackInfo?.driverId,
        name: getDisplayName(driver, fallbackInfo?.name || "Driver"),
        phone: driver?.phone || fallbackInfo?.phone || "",
        email: driver?.email || fallbackInfo?.email || "",
        profilePhoto: driver?.profilePhoto || fallbackInfo?.profilePhoto || fallbackInfo?.photo || "",
        rating: driver?.rating || fallbackInfo?.rating || 5.0,
        vehicleType: vehicle?.vehicleType || fallbackInfo?.vehicleType || "Go",
        vehicleModel: vehicle?.vehicleModel || fallbackInfo?.vehicleModel || "Premium Transport",
        vehiclePlate,
        vehicleNumber: vehiclePlate,
        vehiclePhoto: vehicle?.vehiclePhotos?.[0] || fallbackInfo?.vehiclePhoto || "",
        location: fallbackInfo?.location
    };
};

export const registerTaxiHandlers = (io: Server, socket: Socket) => {
    // Taxi Request
    socket.on("ride-request", async (data: any) => {
        try {
            const { pickup, destination, passengerId, requestedVehicleType, rideId, isSharedRide, promoCode, pricingVehicleType } = data;
            const pricingVehicle = pricingVehicleType || (requestedVehicleType === "carpool" ? "go" : requestedVehicleType);
            const quote = calculateRideQuote({
                vehicleType: pricingVehicle,
                distanceKm: parseFloat(data.distance) || 0,
                durationMinutes: parseFloat(data.duration) || 0,
                isSharedRide: !!isSharedRide,
                seatCount: 1,
            });

            let finalPrice = isSharedRide ? quote.perSeatFare : quote.totalFare;
            let computedOriginalPrice = finalPrice;
            let appliedDiscountId = null;

            // Optional Server side validation of discount
            if (promoCode) {
                const discount = await Discount.findOne({ code: promoCode, active: true, expiryDate: { $gt: new Date() } });
                if (discount && discount.currentUsage < discount.maxUsage) {
                    appliedDiscountId = discount._id;
                    computedOriginalPrice = finalPrice;
                    finalPrice = calculateDiscountedAmount(finalPrice, { type: discount.type, value: discount.value });
                }
            }

            await expirePendingRideRequests();

            // Create ride record using 'createdBy' for passengerId
            const newRide = await createPendingTaxiRideRequest({
                rideId: rideId || `RIDE-${Date.now()}`,
                createdBy: passengerId,
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
                requestedVehicleType: requestedVehicleType === 'carpool' ? 'car' : requestedVehicleType,
                paymentMethod: data.paymentMethod || 'WALLET',
                isSharedRide: isSharedRide || false,
                promoCode: promoCode || null,
                discountId: appliedDiscountId,
                originalPrice: computedOriginalPrice,
                passengerName: data.passengerName,
                passengerPhoto: data.passengerPhoto
            });

            const nearbyDrivers = await getEligibleOnlineDriversForRide({
                ride: newRide,
                requestedVehicleType,
                isSharedRide,
                availableDrivers: await getAvailableDrivers()
            });

            // Notify them
            console.log(`📡 [DISPATCH] Searching for ${requestedVehicleType} drivers (Shared: ${isSharedRide})`);
            
            const deliveredDriverIds: string[] = [];

            nearbyDrivers.forEach(driver => {
                io.to(driver.socketId).emit("ride-request", rideRequestToDriverPayload(newRide));
                deliveredDriverIds.push(driver.driverId);
            });

            if (deliveredDriverIds.length > 0) {
                await Promise.all(
                    deliveredDriverIds.map((driverId) =>
                        markRideRequestsBroadcastedToDriver({
                            driverId,
                            rideIds: [newRide._id]
                        })
                    )
                );
            }

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
                { createdBy: data.passengerId, status: { $in: ["PENDING", "SEARCHING"] } },
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
                .populate('driverId', 'name profilePhoto rating status isBlocked isDeleted')
                .populate('createdBy', 'name profilePhoto rating status isBlocked isDeleted')
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
                    const driver = (pool.driverId || pool.createdBy) as any;
                    const driverId = String(driver?._id || driver || "");
                    if (!driverId) return null;

                    // Verify driver account is still in good standing
                    if (driver && (driver.status === 'INACTIVE' || driver.isBlocked || driver.isDeleted)) {
                        return null;
                    }

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
            console.log("[ride-accept socket event] Received data:", { rideId, driverId, finalDriverId });
            await expirePendingRideRequests();
            
            // ✅ Get full driver & vehicle info to persist on the ride
            const driver = await User.findById(finalDriverId);
            const vehicle = await Vehicle.findOne({ ownerId: driver?._id });
            
            const fullDriverInfo = buildDriverInfo(driver, vehicle, driverInfo);

            const updatedRide = await Ride.findOneAndUpdate({
                rideId,
                status: { $in: ["PENDING", "SEARCHING"] },
                $and: [
                    {
                        $or: [
                            { driverId: { $exists: false } },
                            { driverId: null }
                        ]
                    },
                    {
                        $or: [
                            { expiresAt: { $exists: false } },
                            { expiresAt: null },
                            { expiresAt: { $gt: new Date() } }
                        ]
                    }
                ]
            }, {
                driverId: finalDriverId,
                driverInfo: fullDriverInfo,
                status: 'ACCEPTED',
                acceptedAt: new Date()
            }, { new: true }).populate('createdBy').populate('driverId');
            console.log("[ride-accept socket event] Database update result:", updatedRide ? { _id: updatedRide._id, driverId: updatedRide.driverId, status: updatedRide.status } : "null");

            if (!updatedRide) {
                socket.emit("ride-request-failed", { reason: "This ride request is no longer available." });
                return;
            }

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
                        driverName: getDisplayName(driver, driverInfo?.name || "Your Driver"),
                        vehicleInfo: vehicle ? `${vehicle.vehicleModel} (${vehicle.numberPlate})` : "Standard Vehicle"
                    };

                    if (passenger.email) {
                        void sendBookingConfirmation(passenger.email, details).catch((emailErr) => {
                            console.error("Booking email send error:", emailErr);
                        });
                    }

                    if (passenger.phone) {
                        void sendWhatsAppConfirmation(passenger.phone, details).catch((whatsAppErr) => {
                            console.error("Booking WhatsApp send error:", whatsAppErr);
                        });
                    }
                }
            } catch (emailErr) {
                console.error("Booking email trigger error:", emailErr);
            }

            io.to(`user:${updatedRide.createdBy._id || updatedRide.createdBy}`).emit("ride-accepted", {
                rideId,
                driverId: finalDriverId,
                driverInfo: fullDriverInfo,
                status: 'ACCEPTED',
                ride: updatedRide.toObject()
            });

            const notifiedDriverIds = (updatedRide.broadcastedDrivers || []).map((id: any) => String(id));
            notifiedDriverIds
                .filter((id: string) => id !== String(finalDriverId))
                .forEach((id: string) => {
                    io.to(`driver:${id}`).emit("ride-status-update", {
                        rideId,
                        status: "ACCEPTED",
                        ride: updatedRide.toObject()
                    });
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
                status: { $in: ["PENDING", "SEARCHING"] },
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
            console.log("[update-ride-status socket event] Received data:", { rideId, status, driverId });
            const updatedRide = await Ride.findOneAndUpdate({ rideId }, {
                status,
                ...(driverId ? { driverId } : {}),
                ...(status === 'ARRIVED' ? { arrivedAt: new Date() } : {}),
                ...(status === 'STARTED' ? { startedAt: new Date() } : {}),
                ...(status === 'COMPLETED' ? { completedAt: new Date() } : {})
            }, { new: true }).populate('driverId');
            console.log("[update-ride-status socket event] Database update result:", updatedRide ? { _id: updatedRide._id, driverId: updatedRide.driverId, status: updatedRide.status } : "null");

            if (!updatedRide) {
                console.log("[update-ride-status socket event] No ride found for rideId:", rideId);
                return;
            }

            // ✅ Fix: Construct full driver & vehicle details during any status updates
            if (updatedRide.driverId) {
                const driver = updatedRide.driverId as any;
                const vehicle = await Vehicle.findOne({ ownerId: driver._id });
                const fullDriverInfo = buildDriverInfo(driver, vehicle, {
                    ...(updatedRide.driverInfo || {}),
                    location: updatedRide.driverInfo?.location || updatedRide.driverLocation
                });
                
                updatedRide.driverInfo = fullDriverInfo;
                await Ride.updateOne({ _id: updatedRide._id }, { $set: { driverInfo: fullDriverInfo } });
                console.log("[update-ride-status socket event] Successfully persisted driverInfo:", fullDriverInfo);
            } else {
                console.log("[update-ride-status socket event] updatedRide has NO driverId! Cannot populate driverInfo details.");
            }

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

                const processPayment = async (pId: string, discountedAmount: number, paymentMethod: string, originalAmount?: number) => {
                    const person = await User.findById(pId);
                    if (!person) return false;
                    
                    const grossFare = originalAmount || discountedAmount;
                    let paymentSuccessful = false;

                    if (paymentMethod === 'WALLET') {
                        if ((person.walletBalance || 0) < discountedAmount) {
                            io.to(`user:${pId}`).emit("ride-request-failed", { reason: "Insufficient wallet balance to complete payment." });
                            return false;
                        }
                        person.walletBalance -= discountedAmount;
                        await person.save();
                        
                        await new Transaction({
                            userId: pId,
                            rideId: updatedRide._id,
                            type: 'DEBIT',
                            amount: discountedAmount,
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
                            amount: discountedAmount,
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
                            const feeRate = isCarpool ? 0.15 : 0.25;
                            const platformFee = Math.round(grossFare * feeRate); 
                            const netEarning = grossFare - platformFee;
                            
                            let description = '';
                            let txType: 'CREDIT' | 'DEBIT' = 'CREDIT';
                            let txAmount = 0;

                            if (paymentMethod === 'WALLET') {
                                // Driver gets net earning directly via platform
                                driver.walletBalance = (driver.walletBalance || 0) + netEarning;
                                description = `Earnings for Ride ${rideId} (Gross: ₹${grossFare}, Fee: ₹${platformFee})`;
                                txType = 'CREDIT';
                                txAmount = netEarning;
                            } else {
                                // Passenger paid discountedAmount directly to driver (CASH/UPI)
                                // Driver should have received netEarning.
                                // If discountedAmount > netEarning (e.g. no discount), we deduct the excess (fee).
                                // If discountedAmount < netEarning (e.g. big discount), we credit the difference.
                                const adjustment = netEarning - discountedAmount;
                                
                                driver.walletBalance = (driver.walletBalance || 0) + adjustment;
                                if (adjustment >= 0) {
                                    description = `Reimbursement for discount on Ride ${rideId} (Net Earning: ₹${netEarning}, Received: ₹${discountedAmount})`;
                                    txType = 'CREDIT';
                                    txAmount = adjustment;
                                } else {
                                    description = `Platform fee for Ride ${rideId} (Gross: ₹${grossFare}, Fee: ₹${platformFee})`;
                                    txType = 'DEBIT';
                                    txAmount = Math.abs(adjustment);
                                }
                            }

                            await driver.save();

                            await new Transaction({
                                userId: driverIdFromRide,
                                rideId: updatedRide._id,
                                type: txType,
                                amount: txAmount,
                                description,
                                status: 'SUCCESS',
                                method: 'WALLET',
                                metadata: {
                                    grossAmount: grossFare,
                                    discountedAmount: discountedAmount,
                                    platformFee: platformFee,
                                    commissionRate: feeRate,
                                    netEarning: netEarning
                                }
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
                                const passengerOriginalAmount = (updatedRide.originalPricePerSeat || ((updatedRide.originalPrice ?? updatedRide.price) / updatedRide.passengers.length)) * Number((p as any).seats || 1);

                                io.to(`user:${p.userId}`).emit("ride-status-update", {
                                    rideId,
                                    status,
                                    ride: {
                                        ...updatedRide.toObject(),
                                        paymentMethod: passengerPaymentMethod
                                    }
                                });

                                await processPayment(p.userId.toString(), passengerAmount, passengerPaymentMethod, passengerOriginalAmount || passengerAmount);
                            }
                        }
                    }
                } else {
                    await processPayment(updatedRide.createdBy.toString(), updatedRide.price, updatedRide.paymentMethod, updatedRide.originalPrice ?? updatedRide.price);
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

            // Notify specific driver if assigned
            if (driverId) {
                io.to(`driver:${driverId}`).emit("ride-cancelled", { rideId });
                await updateDriverStatus(driverId, "available");
            } else {
                // If searching, notify all drivers in the pool to remove the request card
                io.to("drivers-pool").emit("ride-cancelled", { rideId });
            }

            // Also broadcast to the ride room for any other observers
            io.to(`ride:${rideId}`).emit("ride-cancelled", { rideId });
            console.log(`❌ Ride ${rideId} cancelled by passenger ${passengerId}`);
        } catch (error) {
            console.error("Ride cancel error:", error);
        }
    });

    // Handle generic ride request cancellation (when timeout occurs or user cancels before matching)
    socket.on("cancel-ride-request", async (data: { passengerId: string }) => {
        try {
            const { passengerId } = data;
            const ride = await Ride.findOneAndUpdate(
                { createdBy: passengerId, status: "PENDING", type: "SOLO" },
                { status: "CANCELLED", cancelledAt: new Date() },
                { new: true }
            );

            if (ride) {
                const rideId = ride._id.toString();
                io.to("drivers-pool").emit("ride-cancelled", { rideId });
                console.log(`❌ Pending ride request cancelled for passenger ${passengerId}`);
            }
        } catch (error) {
            console.error("Cancel ride request error:", error);
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
