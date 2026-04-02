import { Server, Socket } from "socket.io";
import Ride from "../../models/ride";
import Vehicle from "../../models/vehicle";
import Transaction from "../../models/transaction";
import { sendBookingConfirmation } from "../../config/mail";
import { sendWhatsAppConfirmation } from "../../config/twilio";
import User from "../../models/user";
import { removeActiveDriver } from "../state";

export const registerCarpoolHandlers = (io: Server, socket: Socket) => {
    // Carpool Join Request (Passenger -> Server -> Driver)
    socket.on("carpool:join:request", async (data: { 
        rideId: string; 
        userId: string; 
        name: string; 
        seats: number; 
        pickup: any; 
        pickupLabel?: string;
        drop?: any;
        dropLabel?: string;
        seatId?: string; 
        paymentMethod: string; 
        photo?: string;
        distance?: number;
    }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId });
            if (!ride || ride.type !== "CARPOOL") return;

            // Handle Seat Selection System
            if (data.seatId) {
                const requestedSeatIds = data.seatId.split(',');
                let seatsList = (ride as any).seats || [];
                
                // Polyfill seats if the ride was created before seat tracking was fully initialized
                if (seatsList.length === 0) {
                    const isBike = ride.requestedVehicleType === 'bike' || (ride as any).vehicleType === 'bike';
                    const defaultSeats = isBike 
                        ? [{ seatId: 'PILLION', type: 'MIDDLE', status: 'AVAILABLE' }]
                        : [
                            { seatId: 'FRONT_PASSENGER', type: 'FRONT', status: 'AVAILABLE' },
                            { seatId: 'BACK_LEFT', type: 'WINDOW', status: 'AVAILABLE' },
                            { seatId: 'BACK_MIDDLE', type: 'MIDDLE', status: 'AVAILABLE' },
                            { seatId: 'BACK_RIGHT', type: 'WINDOW', status: 'AVAILABLE' }
                        ];

                    let offeredSeats = (ride as any).availableSeats || (isBike ? 1 : 4);
                    seatsList = defaultSeats.map(seat => {
                        if (offeredSeats > 0) {
                            offeredSeats--;
                            return { ...seat, status: 'AVAILABLE' };
                        }
                        return { ...seat, status: 'BOOKED' };
                    });
                    
                    // Save polyfilled seats to DB so arrayFilters work later
                    await Ride.updateOne({ rideId: data.rideId }, { $set: { seats: seatsList } });
                }
                
                const allAvailable = requestedSeatIds.every(id => {
                    const s = seatsList.find((seat: any) => seat.seatId === id);
                    return s && s.status === 'AVAILABLE';
                });

                if (allAvailable) {
                    await Ride.updateOne(
                        { rideId: data.rideId },
                        {
                            $set: {
                                "seats.$[elem].status": "LOCKED",
                                "seats.$[elem].userId": data.userId,
                                "seats.$[elem].lockedUntil": new Date(Date.now() + 5 * 60000)
                            }
                        },
                        {
                            arrayFilters: [{ "elem.seatId": { $in: requestedSeatIds } }]
                        }
                    );
                } else {
                    return socket.emit("ride-request-failed", { reason: "One or more selected seats are no longer available" });
                }
            }

            // Notify driver using their specific room
            if (ride.driverId) {
                io.to(`driver:${ride.driverId}`).emit("carpool:join:new_request", {
                    ...data,
                    paymentMethod: data.paymentMethod || "CASH",
                    passengerSocketId: socket.id // Store socket to reply back
                });
            }
            console.log(`👥 Carpool join requested for ride ${data.rideId} by user ${data.userId}`);
        } catch (error) {
            console.error("Carpool join request error:", error);
        }
    });

    // Carpool Join Accept (Driver -> Server -> Passenger)
    socket.on("carpool:join:accept", async (data: { 
        rideId: string; 
        userId: string; 
        name: string; 
        seats: number; 
        passengerSocketId: string; 
        paymentMethod: string; 
        photo?: string; 
        passengerPhoto?: string; 
        seatId?: string;
        pickupLabel?: string;
        pickup?: any;
        dropLabel?: string;
        drop?: any;
        distance?: number;
    }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId });
            if (!ride || ride.type !== "CARPOOL" || ride.availableSeats < data.seats) return;

            // Confirm Seat Booked
            if (data.seatId) {
                const confirmedSeatIds = data.seatId.split(',');
                await Ride.updateOne(
                    { rideId: data.rideId },
                    {
                        $set: {
                            "seats.$[elem].status": "BOOKED",
                            "seats.$[elem].lockedUntil": null
                        }
                    },
                    {
                        arrayFilters: [{ "elem.seatId": { $in: confirmedSeatIds }, "elem.userId": data.userId }]
                    }
                );
            }

            // Add passenger to ride
            ride.passengers.push({ 
                userId: data.userId as any, 
                name: data.name, 
                photo: data.photo || data.passengerPhoto, // Store photo from request
                seats: data.seats,
                tripStatus: "ACCEPTED",
                paymentMethod: data.paymentMethod || "CASH",
                pickup: {
                    label: data.pickupLabel || "Shared Pickup",
                    coords: data.pickup
                },
                drop: {
                    label: data.dropLabel || "Shared Drop",
                    coords: data.drop
                },
                distance: data.distance || 0
            });
            ride.availableSeats -= data.seats;
            if (ride.availableSeats === 0) ride.status = "FULL";
            await ride.save();

            // Populate driver info so passenger gets it immediately
            const populatedRide = await Ride.findById(ride._id)
                .populate('driverId', 'name email phone profilePhoto rating')
                .populate('passengers.userId', 'name profilePhoto email');

            const passengerRideView = populatedRide?.toObject
                ? {
                    ...populatedRide.toObject(),
                    status: ["OPEN", "FULL"].includes(String((populatedRide as any).status || "")) ? "ACCEPTED" : (populatedRide as any).status,
                    paymentMethod: data.paymentMethod || "CASH"
                }
                : {
                    ...populatedRide,
                    status: ["OPEN", "FULL"].includes(String((populatedRide as any)?.status || "")) ? "ACCEPTED" : (populatedRide as any)?.status,
                    paymentMethod: data.paymentMethod || "CASH"
                };

            // Notify passenger immediately so the UI updates without waiting on extra side effects.
            io.to(`user:${data.userId}`).emit("carpool:join:accepted", { 
                rideId: data.rideId, 
                ride: passengerRideView 
            });
            if (data.passengerSocketId) {
                io.to(data.passengerSocketId).emit("carpool:join:accepted", {
                    rideId: data.rideId,
                    ride: passengerRideView
                });
            }
            io.to(`user:${data.userId}`).emit("ride-status-update", { rideId: data.rideId, status: "ACCEPTED", ride: passengerRideView });
            if (data.passengerSocketId) {
                io.to(data.passengerSocketId).emit("ride-status-update", { rideId: data.rideId, status: "ACCEPTED", ride: passengerRideView });
            }
            io.to(`ride:${data.rideId}`).emit("ride:update", populatedRide);
            io.emit("ride:update", populatedRide);

            // Non-critical work continues in the background so acceptance feels instant.
            void (async () => {
                try {
                    await Ride.updateMany(
                        { createdBy: data.userId, status: "SEARCHING", type: "CARPOOL" },
                        { status: "CANCELLED", cancelledAt: new Date() }
                    );
                } catch (cleanupErr) {
                    console.error("Carpool accept cleanup error:", cleanupErr);
                }

                try {
                    const passengerUser = await User.findById(data.userId);
                    if (passengerUser && (passengerUser.email || passengerUser.phone)) {
                        const driver = populatedRide?.driverId as any;
                        const vehicle = await Vehicle.findOne({ ownerId: driver?._id });
                        const details = {
                            rideId: ride.rideId,
                            pickup: ride.pickup?.label || "Current Location",
                            destination: ride.drop?.label || "Selected Destination",
                            fare: ride.pricePerSeat || (ride.price / (ride.passengers.length || 1)),
                            driverName: driver?.name || "Your Driver",
                            vehicleInfo: vehicle ? `${vehicle.vehicleModel} (${vehicle.numberPlate})` : "Standard Vehicle"
                        };

                        if (passengerUser.email) {
                            await sendBookingConfirmation(passengerUser.email, details);
                        }

                        if (passengerUser.phone) {
                            await sendWhatsAppConfirmation(passengerUser.phone, details);
                        }
                    }
                } catch (emailErr) {
                    console.error("Carpool booking email trigger error:", emailErr);
                }
            })();
            
            console.log(`✅ Carpool join approved for ride ${data.rideId}, user ${data.userId} joined`);
        } catch (error) {
            console.error("Carpool join accept error:", error);
        }
    });

    // Driver Starts a New Shared Trip (Driver -> Server)
    socket.on("driver:trip:start", async (data: any) => {
        try {
            const { driverId, vehicleType, seats, pickup, drop, distance, duration, price } = data;
            
            const rideId = `POOL-${Date.now()}`;
            
            let defaultSeats = [];
            if (vehicleType === 'bike') {
                defaultSeats = [{ seatId: 'PILLION', type: 'MIDDLE', status: 'AVAILABLE' }];
            } else if (vehicleType === 'auto') {
                defaultSeats = [
                    { seatId: 'BACK_LEFT', type: 'WINDOW', status: 'AVAILABLE' },
                    { seatId: 'BACK_MIDDLE', type: 'MIDDLE', status: 'AVAILABLE' },
                    { seatId: 'BACK_RIGHT', type: 'WINDOW', status: 'AVAILABLE' }
                ];
            } else if (vehicleType === 'xl') {
                defaultSeats = [
                    { seatId: 'FRONT_PASSENGER', type: 'FRONT', status: 'AVAILABLE' },
                    { seatId: 'MIDDLE_LEFT', type: 'WINDOW', status: 'AVAILABLE' },
                    { seatId: 'MIDDLE_RIGHT', type: 'WINDOW', status: 'AVAILABLE' },
                    { seatId: 'BACK_LEFT', type: 'WINDOW', status: 'AVAILABLE' },
                    { seatId: 'BACK_MIDDLE', type: 'MIDDLE', status: 'AVAILABLE' },
                    { seatId: 'BACK_RIGHT', type: 'WINDOW', status: 'AVAILABLE' }
                ];
            } else {
                defaultSeats = [
                    { seatId: 'FRONT_PASSENGER', type: 'FRONT', status: 'AVAILABLE' },
                    { seatId: 'BACK_LEFT', type: 'WINDOW', status: 'AVAILABLE' },
                    { seatId: 'BACK_MIDDLE', type: 'MIDDLE', status: 'AVAILABLE' },
                    { seatId: 'BACK_RIGHT', type: 'WINDOW', status: 'AVAILABLE' }
                ];
            }

            let offeredSeats = parseInt(seats) || 1;
            const finalSeats = defaultSeats.map(seat => {
                if (offeredSeats > 0) {
                    offeredSeats--;
                    return { ...seat, status: 'AVAILABLE' };
                }
                return { ...seat, status: 'BOOKED' };
            });
            const newRide = await Ride.create({
                rideId,
                createdBy: driverId,
                driverId: driverId,
                type: 'CARPOOL',
                status: 'OPEN',
                pickup: {
                    lat: pickup.lat,
                    lng: pickup.lng,
                    label: pickup.label || "Pickup",
                    location: { type: "Point", coordinates: [pickup.lng, pickup.lat] }
                },
                drop: {
                    lat: drop.lat,
                    lng: drop.lng,
                    label: drop.label || "Destination",
                    location: { type: "Point", coordinates: [drop.lng, drop.lat] }
                },
                requestedVehicleType: vehicleType || 'car',
                availableSeats: seats || 1,
                seats: finalSeats,
                price: price || (vehicleType === 'bike' ? 40 : 100),
                pricePerSeat: price || (vehicleType === 'bike' ? 40 : 100),
                distance: parseFloat(distance) || 0,
                duration: parseFloat(duration) || 0,
                isSharedRide: true
            });

            socket.join(`ride:${rideId}`);
            socket.join(`driver:${driverId}`);
            
            // Notify the driver that the trip is live
            socket.emit("driver:trip:started", { rideId, ride: newRide });
            
            // Broadcast the new ride to everyone so it appears in passenger lists
            io.emit("ride:update", newRide);
            console.log(`🚀 New Carpool created by driver ${driverId}: ${rideId}`);
        } catch (error) {
            console.error("Driver trip start error:", error);
            socket.emit("ride-request-failed", { reason: "Failed to start carpool trip." });
        }
    });

    // Carpool Join Reject
    socket.on("carpool:join:reject", async (data: { rideId: string; userId: string; passengerSocketId: string }) => {
        try {
            // Notify passenger using persistent room
            io.to(`user:${data.userId}`).emit("carpool:join:rejected", { 
                rideId: data.rideId,
                reason: "Driver declined your join request."
            });
            console.log(`❌ Carpool join rejected for ride ${data.rideId}, user ${data.userId} declined`);
        } catch (error) {
            console.error("Carpool join reject error:", error);
        }
    });

    socket.on("carpool:passenger:end", async (data: { rideId: string; userId: string }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId })
                .populate('driverId', 'name email phone profilePhoto rating')
                .populate('passengers.userId', 'name profilePhoto email');

            if (!ride || ride.type !== "CARPOOL") return;

            const passenger = ride.passengers.find((p: any) => String(p.userId?._id || p.userId) === String(data.userId));
            if (!passenger) return;

            const passengerRideView = {
                ...(ride.toObject ? ride.toObject() : ride),
                status: "COMPLETED",
                paymentMethod: passenger.paymentMethod || ride.paymentMethod || "CASH",
                completedAt: new Date()
            };

            const releasedSeats = Number(passenger.seats || 1);

            // Mark passenger as completed INSTEAD of deleting them, so payment settlement has their data
            passenger.tripStatus = "COMPLETED";
            
            // Release the physical visual seats instantly back to the pool
            if (ride.seats && ride.seats.length > 0) {
                ride.seats.forEach((seat: any) => {
                    if (String(seat.userId) === String(data.userId) || String(seat.userId?._id) === String(data.userId)) {
                        seat.status = 'AVAILABLE';
                        seat.userId = null;
                        seat.lockedUntil = null;
                    }
                });
                ride.markModified('seats');
            }

            ride.availableSeats += releasedSeats;

            if (ride.status === "FULL" && ride.availableSeats > 0) {
                ride.status = "STARTED";
            }

            await ride.save();

            // ✅ Carpool Payment Processing & 15% Commission Deduction
            try {
                const driverId = ride.driverId?._id || ride.driverId;
                const passengerId = data.userId;
                const amount = (ride.pricePerSeat || 0) * releasedSeats;
                const paymentMethod = passenger.paymentMethod || "CASH";

                if (amount > 0 && driverId) {
                    const driver = await User.findById(driverId);
                    if (driver) {
                        const feeRate = 0.15; // 15% for Carpool
                        const platformFee = Math.round(amount * feeRate);
                        
                        if (paymentMethod === "WALLET") {
                            // Deduct from passenger already happened? No, needs to happen here for Carpool
                            const passUser = await User.findById(passengerId);
                            if (passUser && (passUser.walletBalance || 0) >= amount) {
                                passUser.walletBalance -= amount;
                                await passUser.save();
                                
                                await new Transaction({
                                    userId: passengerId,
                                    rideId: ride._id,
                                    type: 'DEBIT',
                                    amount: amount,
                                    description: `Payment for Carpool Ride ${ride.rideId}`,
                                    status: 'SUCCESS',
                                    method: 'WALLET'
                                }).save();
                                io.to(`user:${passengerId}`).emit("wallet-update", { balance: passUser.walletBalance });

                                // Credit Driver
                                const finalEarned = amount - platformFee;
                                driver.walletBalance = (driver.walletBalance || 0) + finalEarned;
                                await driver.save();
                                await new Transaction({
                                    userId: driverId,
                                    rideId: ride._id,
                                    type: 'CREDIT',
                                    amount: finalEarned,
                                    description: `Earnings for Carpool ${ride.rideId} (15% fee ₹${platformFee})`,
                                    status: 'SUCCESS',
                                    method: 'WALLET'
                                }).save();
                                io.to(`user:${driverId}`).emit("wallet-update", { balance: driver.walletBalance });
                            }
                        } else if (paymentMethod === "CASH" || paymentMethod === "UPI") {
                            // Driver received full amount, deduct fee from their wallet
                            driver.walletBalance = (driver.walletBalance || 0) - platformFee;
                            await driver.save();
                            await new Transaction({
                                userId: driverId,
                                rideId: ride._id,
                                type: 'DEBIT',
                                amount: platformFee,
                                description: `Platform fee for Carpool ${ride.rideId} (Paid via ${paymentMethod})`,
                                status: 'SUCCESS',
                                method: 'WALLET'
                                }).save();
                            io.to(`user:${driverId}`).emit("wallet-update", { balance: driver.walletBalance });
                        }
                    }
                }
            } catch (payErr) {
                console.error("Carpool payment automated error:", payErr);
            }

            const updatedRide = await Ride.findById(ride._id)
                .populate('driverId', 'name email phone profilePhoto rating')
                .populate('passengers.userId', 'name profilePhoto email');

            io.to(`user:${data.userId}`).emit("ride-status-update", {
                rideId: data.rideId,
                status: "COMPLETED",
                ride: passengerRideView
            });

            io.to(`ride:${data.rideId}`).emit("ride:update", updatedRide);
            io.emit("ride:update", updatedRide);

            console.log(`✅ Carpool passenger ended for ride ${data.rideId}, user ${data.userId}`);
        } catch (error) {
            console.error("Carpool passenger end error:", error);
        }
    });

    socket.on("carpool:passenger:status", async (data: { rideId: string; userId: string; status: "ARRIVED" | "STARTED" }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId })
                .populate('driverId', 'name email phone profilePhoto rating')
                .populate('passengers.userId', 'name profilePhoto email');

            if (!ride || ride.type !== "CARPOOL") return;

            const passenger = ride.passengers.find((p: any) => String(p.userId?._id || p.userId) === String(data.userId));
            if (!passenger) return;

            (passenger as any).tripStatus = data.status;
            await ride.save();

            const updatedRide = await Ride.findById(ride._id)
                .populate('driverId', 'name email phone profilePhoto rating')
                .populate('passengers.userId', 'name profilePhoto email');

            const passengerEntry = updatedRide?.passengers.find((p: any) => String(p.userId?._id || p.userId) === String(data.userId));

            const passengerRideView = updatedRide?.toObject
                ? {
                    ...updatedRide.toObject(),
                    status: passengerEntry?.tripStatus || data.status,
                    paymentMethod: passengerEntry?.paymentMethod || ride.paymentMethod || "CASH"
                }
                : {
                    ...updatedRide,
                    status: passengerEntry?.tripStatus || data.status,
                    paymentMethod: passengerEntry?.paymentMethod || ride.paymentMethod || "CASH"
                };

            io.to(`user:${data.userId}`).emit("ride-status-update", {
                rideId: data.rideId,
                status: passengerEntry?.tripStatus || data.status,
                ride: passengerRideView
            });

            io.to(`ride:${data.rideId}`).emit("ride:update", updatedRide);
            io.emit("ride:update", updatedRide);

            console.log(`✅ Carpool passenger status updated for ride ${data.rideId}, user ${data.userId}: ${data.status}`);
        } catch (error) {
            console.error("Carpool passenger status update error:", error);
        }
    });

    socket.on("driver:session:end", async (data: { rideId: string; driverId: string }) => {
        try {
            const updatedRide = await Ride.findOneAndUpdate({ rideId: data.rideId }, {
                status: 'COMPLETED',
                completedAt: new Date()
            }, { new: true })
                .populate('driverId', 'name email phone profilePhoto rating')
                .populate('passengers.userId', 'name profilePhoto email');
            
            // ✅ FIX: Remove from active drivers pool to clear map icon immediately
            await removeActiveDriver(data.driverId);

            if (updatedRide) {
                io.to(`driver:${data.driverId}`).emit("ride-status-update", {
                    rideId: data.rideId,
                    status: "COMPLETED",
                    ride: updatedRide
                });
                io.to(`ride:${data.rideId}`).emit("ride:update", updatedRide);
                io.emit("ride:update", updatedRide);
            }
            
            console.log(`🏁 Driver ${data.driverId} ended carpool session ${data.rideId} silently.`);
        } catch (error) {
            console.error("Driver session end error:", error);
        }
    });

    socket.on("carpool:ride:cancel", async (data: { rideId: string; driverId: string }) => {
        try {
            const ride = await Ride.findOneAndUpdate({ rideId: data.rideId }, {
                status: 'CANCELLED',
                cancelledAt: new Date()
            }, { new: true });

            if (ride) {
                // Notify all passengers that the ride was cancelled by the driver
                ride.passengers.forEach((p: any) => {
                    const passengerId = p.userId?._id || p.userId;
                    if (passengerId) {
                        io.to(`user:${passengerId}`).emit("ride:cancelled", { 
                            rideId: data.rideId,
                            reason: "The driver has cancelled this carpool session."
                        });
                    }
                });
                
                // Broadcast to the ride room
                io.to(`ride:${data.rideId}`).emit("ride:update", ride);
            }
            
            await removeActiveDriver(data.driverId);
            console.log(`❌ Driver ${data.driverId} cancelled carpool session ${data.rideId}.`);
        } catch (error) {
            console.error("Carpool ride cancel error:", error);
        }
    });
};
