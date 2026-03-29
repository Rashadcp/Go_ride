import { Server, Socket } from "socket.io";
import Ride from "../../models/ride";

export const registerCarpoolHandlers = (io: Server, socket: Socket) => {
    // Carpool Join Request (Passenger -> Server -> Driver)
    socket.on("carpool:join:request", async (data: { rideId: string; userId: string; name: string; seats: number; pickup: any }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId });
            if (!ride || ride.type !== "CARPOOL") return;

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
    socket.on("carpool:join:accept", async (data: { rideId: string; userId: string; name: string; seats: number; passengerSocketId: string; paymentMethod: string; photo?: string; passengerPhoto?: string }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId });
            if (!ride || ride.type !== "CARPOOL" || ride.availableSeats < data.seats) return;

            // Add passenger to ride
            ride.passengers.push({ 
                userId: data.userId as any, 
                name: data.name, 
                photo: data.photo || data.passengerPhoto, // Store photo from request
                seats: data.seats,
                paymentMethod: data.paymentMethod || "CASH"
            });
            ride.availableSeats -= data.seats;
            if (ride.availableSeats === 0) ride.status = "FULL";
            await ride.save();

            // Populate driver info so passenger gets it immediately
            const populatedRide = await Ride.findById(ride._id)
                .populate('driverId', 'name email phone profilePhoto rating')
                .populate('passengers.userId', 'name profilePhoto');

            const passengerRideView = populatedRide?.toObject
                ? {
                    ...populatedRide.toObject(),
                    paymentMethod: data.paymentMethod || "CASH"
                }
                : {
                    ...populatedRide,
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
};
