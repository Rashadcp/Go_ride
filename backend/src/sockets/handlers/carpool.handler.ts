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
    socket.on("carpool:join:accept", async (data: { rideId: string; userId: string; name: string; seats: number; passengerSocketId: string }) => {
        try {
            const ride = await Ride.findOne({ rideId: data.rideId });
            if (!ride || ride.type !== "CARPOOL" || ride.availableSeats < data.seats) return;

            // Add passenger to ride
            ride.passengers.push({ 
                userId: data.userId as any, 
                name: data.name, 
                seats: data.seats 
            });
            ride.availableSeats -= data.seats;
            if (ride.availableSeats === 0) ride.status = "FULL";
            await ride.save();

            // Notify passenger using their persistent user room
            io.to(`user:${data.userId}`).emit("carpool:join:accepted", { 
                rideId: data.rideId, 
                ride 
            });

            // [FIX] Clean up any other "SEARCHING" taxi requests for this passenger 
            // since they are now part of this carpool
            await Ride.updateMany(
                { createdBy: data.userId, status: "SEARCHING", type: "CARPOOL" },
                { status: "CANCELLED", cancelledAt: new Date() }
            );
            console.log(`🧹 Cleaned up searching requests for joined passenger ${data.userId}`);
            
            // Re-broadcast updated ride to the specific ride room and everyone
            io.to(`ride:${data.rideId}`).emit("ride:update", ride);
            io.to(`user:${data.userId}`).emit("ride-status-update", { rideId: data.rideId, status: "ACCEPTED", ride });
            
            // Still broadcast globally for list updates if needed
            io.emit("ride:update", ride);
            
            console.log(`✅ Carpool join approved for ride ${data.rideId}, user ${data.userId} joined`);
        } catch (error) {
            console.error("Carpool join accept error:", error);
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
