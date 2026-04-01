import { Server, Socket } from "socket.io";
import Ride from "../../models/ride";
import Vehicle from "../../models/vehicle";
import { sendBookingConfirmation } from "../../config/mail";
import { sendWhatsAppConfirmation } from "../../config/twilio";
import User from "../../models/user";

export const registerCarpoolHandlers = (io: Server, socket: Socket) => {
    // Carpool Join Request (Passenger -> Server -> Driver)
    socket.on("carpool:join:request", async (data: { rideId: string; userId: string; name: string; seats: number; pickup: any; seatId?: string }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId });
            if (!ride || ride.type !== "CARPOOL") return;

            // Handle Seat Selection System
            if (data.seatId) {
                const targetSeat = (ride as any).seats?.find((s: any) => s.seatId === data.seatId);
                if (targetSeat && targetSeat.status === 'AVAILABLE') {
                    await Ride.updateOne(
                        { rideId: data.rideId, "seats.seatId": data.seatId },
                        {
                            $set: {
                                "seats.$.status": "LOCKED",
                                "seats.$.userId": data.userId,
                                "seats.$.lockedUntil": new Date(Date.now() + 5 * 60000)
                            }
                        }
                    );
                } else {
                    return socket.emit("ride-request-failed", { reason: "Seat is no longer available" });
                }
            }

            // Notify driver using their specific room
            if (ride.driverId) {
                io.to(`driver:${ride.driverId}`).emit("carpool:join:new_request", {
                    ...data,
                    passengerSocketId: socket.id // Store socket to reply back
                });
            }
            console.log(`👥 Carpool join requested for ride ${data.rideId} by user ${data.userId}`);
        } catch (error) {
            console.error("Carpool join request error:", error);
        }
    });

    // Carpool Join Accept (Driver -> Server -> Passenger)
    socket.on("carpool:join:accept", async (data: { rideId: string; userId: string; name: string; seats: number; passengerSocketId: string; paymentMethod: string; photo?: string; passengerPhoto?: string; seatId?: string }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId });
            if (!ride || ride.type !== "CARPOOL" || ride.availableSeats < data.seats) return;

            // Confirm Seat Booked
            if (data.seatId) {
                await Ride.updateOne(
                    { rideId: data.rideId, "seats.seatId": data.seatId, "seats.userId": data.userId },
                    {
                        $set: {
                            "seats.$.status": "BOOKED",
                            "seats.$.lockedUntil": null
                        }
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
                paymentMethod: data.paymentMethod || "CASH"
            });
            ride.availableSeats -= data.seats;
            if (ride.availableSeats === 0) ride.status = "FULL";
            await ride.save();

            // Populate driver info so passenger gets it immediately
            const populatedRide = await Ride.findById(ride._id)
                .populate('driverId', 'name email phone profilePhoto rating')
                .populate('passengers.userId', 'name profilePhoto email');

            const passengerUser = await User.findById(data.userId);

            // Trigger Email Booking Confirmation to Passenger (Carpool)
            try {
                if (passengerUser && (passengerUser.email || passengerUser.phone)) {
                    const driver = populatedRide?.driverId as any;
                    const vehicle = await Vehicle.findOne({ ownerId: driver?._id });
                    const details = {
                        rideId: ride.rideId,
                        pickup: ride.pickup?.label || "Current Location",
                        destination: ride.drop?.label || "Selected Destination",
                        fare: ride.pricePerSeat || (ride.price / (ride.passengers.length || 1)), // Carpool price is usually per seat
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

            // Notify passenger using their persistent user room
            io.to(`user:${data.userId}`).emit("carpool:join:accepted", { 
                rideId: data.rideId, 
                ride: passengerRideView 
            });

            // [FIX] Clean up any other "SEARCHING" taxi requests for this passenger 
            // since they are now part of this carpool
            await Ride.updateMany(
                { createdBy: data.userId, status: "SEARCHING", type: "CARPOOL" },
                { status: "CANCELLED", cancelledAt: new Date() }
            );
            
            // Re-broadcast updated ride to the specific ride room and everyone
            io.to(`ride:${data.rideId}`).emit("ride:update", populatedRide);
            io.to(`user:${data.userId}`).emit("ride-status-update", { rideId: data.rideId, status: "ACCEPTED", ride: passengerRideView });
            
            // Still broadcast globally for list updates if needed
            io.emit("ride:update", populatedRide);
            
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

            ride.passengers = ride.passengers.filter((p: any) => String(p.userId?._id || p.userId) !== String(data.userId)) as any;
            ride.availableSeats += releasedSeats;

            if (ride.status === "FULL" && ride.availableSeats > 0) {
                ride.status = "STARTED";
            }

            await ride.save();

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
};
