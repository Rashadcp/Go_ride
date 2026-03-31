"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaxiHandlers = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const state_1 = require("../state");
const ride_1 = __importDefault(require("../../models/ride"));
const user_1 = __importDefault(require("../../models/user"));
const transaction_1 = __importDefault(require("../../models/transaction"));
const discount_1 = __importDefault(require("../../models/discount"));
const vehicle_1 = __importDefault(require("../../models/vehicle"));
const mail_1 = require("../../config/mail");
const twilio_1 = require("../../config/twilio");
const registerTaxiHandlers = (io, socket) => {
    // Taxi Request
    socket.on("ride-request", async (data) => {
        try {
            const { pickup, destination, passengerId, requestedVehicleType, fare, rideId, isSharedRide, promoCode } = data;
            let finalPrice = fare;
            let appliedDiscountId = null;
            // Optional Server side validation of discount
            if (promoCode) {
                const discount = await discount_1.default.findOne({ code: promoCode, active: true, expiryDate: { $gt: new Date() } });
                if (discount && discount.currentUsage < discount.maxUsage) {
                    appliedDiscountId = discount._id;
                    // Note: We trust the client fare for now as it matched the UI, but we could recalculate here
                    // discount.currentUsage += 1; // Increment usage on dispatch or completion? usually dispatch
                    await discount_1.default.findByIdAndUpdate(discount._id, { $inc: { currentUsage: 1 } });
                }
            }
            // Create ride record using 'createdBy' for passengerId
            const newRide = await ride_1.default.create({
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
            const getDistance = (lat1, lon1, lat2, lon2) => {
                const R = 6371; // km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };
            const nearbyDrivers = (await (0, state_1.getAvailableDrivers)()).filter(d => {
                if (!d.location?.lat || !d.location?.lng)
                    return false;
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
            let matchingPools = [];
            if (isSharedRide) {
                const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
                matchingPools = await ride_1.default.find({
                    type: 'CARPOOL',
                    status: 'OPEN',
                    availableSeats: { $gt: 0 },
                    createdAt: { $gte: fourHoursAgo },
                    "drop.label": destination.label
                }).populate('createdBy', 'name phone email profilePhoto rating').populate('driverId', 'name phone email profilePhoto rating').limit(1);
            }
            if (matchingPools.length > 0) {
                const notifiedDrivers = new Set();
                for (const p of matchingPools) {
                    const driver = p.createdBy;
                    const driverIdStr = driver._id.toString();
                    if (notifiedDrivers.has(driverIdStr))
                        continue;
                    const driverSocket = await (0, state_1.getActiveDriver)(driverIdStr);
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
        }
        catch (error) {
            console.error("Taxi request error:", error);
            socket.emit("ride-request-failed", { reason: "Internal server error" });
        }
    });
    socket.on("cancel-ride-request", async (data) => {
        try {
            await ride_1.default.findOneAndUpdate({ createdBy: data.passengerId, status: 'SEARCHING' }, { status: 'CANCELLED', cancelledAt: new Date() }, { new: true });
        }
        catch (error) {
            console.error("Cancel ride error:", error);
        }
    });
    socket.on("get-available-carpools", async (data) => {
        try {
            const { pickup, destination } = data || {};
            if (!pickup?.lat || !pickup?.lng) {
                return socket.emit("available-carpools", []);
            }
            const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
            const query = {
                type: 'CARPOOL',
                status: 'OPEN', // Only show active driver-hosted pools
                availableSeats: { $gt: 0 },
                createdAt: { $gte: fourHoursAgo }
            };
            // Exclude the current user's own carpool if they are the one searching
            // Proper ObjectId comparison is necessary for Mongoose $ne queries
            if (data.userId && mongoose_1.default.Types.ObjectId.isValid(data.userId)) {
                const hostId = new mongoose_1.default.Types.ObjectId(data.userId);
                query.driverId = { $ne: hostId };
                query.createdBy = { $ne: hostId };
            }
            query["pickup.location"] = {
                $near: {
                    $geometry: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
                    $maxDistance: 50000 // 50km
                }
            };
            const pools = await ride_1.default.find(query)
                .populate('driverId', 'name profilePhoto rating')
                .populate('createdBy', 'name profilePhoto rating')
                .limit(10); // Show more than 1 pool!
            let filteredPools = pools;
            if (destination?.lat && destination?.lng) {
                filteredPools = pools.filter(p => {
                    const dLoc = p.drop?.location?.coordinates || [p.drop?.lng || 0, p.drop?.lat || 0];
                    if (!dLoc || dLoc[0] === 0)
                        return true;
                    // Properly check destination distance (0.1 degree limit)
                    const dist = Math.sqrt(Math.pow(dLoc[0] - destination.lng, 2) + Math.pow(dLoc[1] - destination.lat, 2));
                    return dist < 0.25;
                });
            }
            const enrichedPools = filteredPools.map(p => {
                const driver = p.driverId || p.createdBy;
                return {
                    ...p.toObject(),
                    driverName: driver?.name || "Available Driver",
                    driverPhoto: driver?.profilePhoto,
                    driverRating: driver?.rating || 4.8,
                    vehicleType: p.requestedVehicleType || 'car' // Ensure vehicleType is present
                };
            });
            socket.emit("available-carpools", enrichedPools);
        }
        catch (error) {
            console.error("Error fetching carpools:", error);
        }
    });
    socket.on("ride-accept", async (data) => {
        try {
            const { rideId, driverId, driverInfo } = data;
            const finalDriverId = driverId || socket.data.user?.id || socket.data.user?._id;
            const updatedRide = await ride_1.default.findOneAndUpdate({ rideId }, {
                driverId: finalDriverId,
                status: 'ACCEPTED',
                acceptedAt: new Date()
            }, { new: true }).populate('createdBy').populate('driverId');
            if (!updatedRide)
                return;
            // Trigger Email Booking Confirmation to Passenger
            try {
                const passenger = updatedRide.createdBy;
                const driver = updatedRide.driverId;
                console.log(`[Ride Acceptance Notice] Passenger ${passenger?.name}, Email: ${passenger?.email}, Phone: ${passenger?.phone}`);
                if (passenger && (passenger.email || passenger.phone)) {
                    const vehicle = await vehicle_1.default.findOne({ ownerId: driver?._id });
                    const details = {
                        rideId: updatedRide.rideId,
                        pickup: updatedRide.pickup?.label || "Current Location",
                        destination: updatedRide.drop?.label || "Selected Destination",
                        fare: updatedRide.price,
                        driverName: driver?.name || "Your Driver",
                        vehicleInfo: vehicle ? `${vehicle.vehicleModel} (${vehicle.numberPlate})` : "Standard Vehicle"
                    };
                    if (passenger.email) {
                        await (0, mail_1.sendBookingConfirmation)(passenger.email, details);
                    }
                    if (passenger.phone) {
                        await (0, twilio_1.sendWhatsAppConfirmation)(passenger.phone, details);
                    }
                }
            }
            catch (emailErr) {
                console.error("Booking email trigger error:", emailErr);
            }
            // ✅ Notify the accepted user
            io.to(`user:${updatedRide.createdBy}`).emit("ride-accepted", {
                rideId,
                driverId: finalDriverId,
                driverInfo,
                status: 'ACCEPTED',
                ride: {
                    ...updatedRide.toObject(),
                    driverId: finalDriverId,
                    driverInfo
                }
            });
            if (finalDriverId) {
                await (0, state_1.updateDriverStatus)(finalDriverId.toString(), "busy");
                // ✅ FIX: Broadcast updated driver list to ALL users so car icons
                // disappear from every user's map when this driver goes busy
                const updatedDriverList = await (0, state_1.getAvailableDrivers)();
                io.emit("active-drivers", updatedDriverList);
            }
            // ✅ FIX: Find other SEARCHING rides (other users who requested same driver)
            // and cancel them so they don't get stuck waiting forever
            const otherStuckRides = await ride_1.default.find({
                rideId: { $ne: rideId },
                status: 'SEARCHING',
                requestedVehicleType: updatedRide.requestedVehicleType,
                type: updatedRide.type,
                createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // within last 5 min
            });
            for (const stuckRide of otherStuckRides) {
                await ride_1.default.findByIdAndUpdate(stuckRide._id, {
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
        }
        catch (error) {
            console.error("Taxi accept error:", error);
        }
    });
    socket.on("update-ride-status", async (data) => {
        try {
            const { rideId, status, driverId } = data;
            const updatedRide = await ride_1.default.findOneAndUpdate({ rideId }, {
                status,
                ...(status === 'ARRIVED' ? { arrivedAt: new Date() } : {}),
                ...(status === 'STARTED' ? { startedAt: new Date() } : {}),
                ...(status === 'COMPLETED' ? { completedAt: new Date() } : {})
            }, { new: true });
            if (!updatedRide)
                return;
            const payload = {
                ...data,
                status,
                ride: updatedRide.toObject()
            };
            io.to(`user:${updatedRide.createdBy}`).emit("ride-status-update", payload);
            io.to(`ride:${rideId}`).emit("ride-status-update", payload);
            if (updatedRide.passengers && updatedRide.passengers.length > 0) {
                updatedRide.passengers.forEach((p) => {
                    if (p.userId) {
                        io.to(`user:${p.userId}`).emit("ride-status-update", payload);
                    }
                });
            }
            if (status === 'COMPLETED') {
                const driverIdFromRide = updatedRide.driverId;
                const isCarpool = updatedRide.type === 'CARPOOL' || updatedRide.isSharedRide;
                const processPayment = async (pId, amount, paymentMethod) => {
                    const person = await user_1.default.findById(pId);
                    if (!person)
                        return false;
                    if (paymentMethod === 'WALLET') {
                        if ((person.walletBalance || 0) < amount) {
                            io.to(`user:${pId}`).emit("ride-request-failed", { reason: "Insufficient wallet balance to complete payment." });
                            return false;
                        }
                        person.walletBalance -= amount;
                        await person.save();
                        await new transaction_1.default({
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
                            const driver = await user_1.default.findById(driverIdFromRide);
                            if (driver) {
                                const finalEarned = Math.round(amount * 0.75); // 25% platform fee
                                driver.walletBalance = (driver.walletBalance || 0) + finalEarned;
                                await driver.save();
                                await new transaction_1.default({
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
                    }
                    else if (paymentMethod === 'CASH') {
                        await new transaction_1.default({
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
                    else if (paymentMethod === 'UPI') {
                        return true;
                    }
                    return false;
                };
                if (isCarpool) {
                    if (updatedRide.passengers && updatedRide.passengers.length > 0) {
                        for (const p of updatedRide.passengers) {
                            if (p.userId) {
                                const passengerPaymentMethod = p.paymentMethod || updatedRide.paymentMethod || 'CASH';
                                const passengerAmount = (updatedRide.pricePerSeat || (updatedRide.price / updatedRide.passengers.length)) * Number(p.seats || 1);
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
                }
                else {
                    await processPayment(updatedRide.createdBy.toString(), updatedRide.price, updatedRide.paymentMethod);
                }
                const completedDriverId = driverIdFromRide?.toString();
                if (completedDriverId) {
                    await (0, state_1.updateDriverStatus)(completedDriverId, "available");
                }
            }
        }
        catch (error) {
            console.error("Update status error:", error);
        }
    });
    socket.on("ride-cancel", async (data) => {
        try {
            const { rideId, passengerId, driverId } = data;
            const updatedRide = await ride_1.default.findOneAndUpdate({ rideId }, {
                status: 'CANCELLED',
                cancelledAt: new Date()
            }, { new: true });
            if (!updatedRide)
                return;
            const recipientId = passengerId || updatedRide.createdBy;
            io.to(`user:${recipientId}`).emit("ride-cancelled", { rideId });
            if (driverId) {
                io.to(`driver:${driverId}`).emit("ride-cancelled", { rideId });
                await (0, state_1.updateDriverStatus)(driverId, "available");
            }
        }
        catch (error) {
            console.error("Cancel ride error:", error);
        }
    });
    socket.on("ride-reject", async (data) => {
        try {
            const { rideId, driverId } = data;
            await ride_1.default.findOneAndUpdate({ rideId }, { $push: { candidateDrivers: { driverId, status: "REJECTED", rejectedAt: new Date() } } }, { new: true });
        }
        catch (error) {
            console.error("Taxi reject error:", error);
        }
    });
};
exports.registerTaxiHandlers = registerTaxiHandlers;
