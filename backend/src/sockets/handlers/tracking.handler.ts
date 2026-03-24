import { Server, Socket } from "socket.io";
import Ride from "../../models/ride";

export const registerTrackingHandlers = (io: Server, socket: Socket) => {
    // Live Driver Location Update (Driver -> Server -> Passenger)
    socket.on("driver:location:update", async (data: { driverId: string; location: { lat: number; lng: number } }) => {
        try {
            const { driverId, location } = data;
            
            // Broadcast location to specific ride rooms
            // In the modular architecture, we join rooms for rides
            // io.to(`ride:${driverId}`).emit("driver-location-update", data); // Existing format
            io.to(`track:${driverId}`).emit("driver:location:updated", data);

            // Update DB if needed (not for every heartbeat, but occasionally)
            // Existing logic does this every check - let's maintain consistency for now but follow blueprint path.
            const ride = await Ride.findOne({
                driverId,
                status: { $in: ["ACCEPTED", "ARRIVED", "STARTED"] }
            });
            if (ride) {
                ride.driverLocation = location;
                await ride.save();
            }
        } catch (error) {
            console.error("Tracking location update error:", error);
        }
    });
};
