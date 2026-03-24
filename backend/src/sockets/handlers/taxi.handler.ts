import { Server, Socket } from "socket.io";
import { activeDrivers } from "../../config/socket";
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
                pickup: { lat: pickup.lat, lng: pickup.lng, label: pickup.label },
                drop: { lat: destination.lat, lng: destination.lng, label: destination.label },
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
            const nearbyDrivers = Array.from(activeDrivers.values()).filter(d => 
                d.status === "available" && (isSharedRide || d.vehicleType === requestedVehicleType)
            );

            // Notify them
            nearbyDrivers.forEach(driver => {
                io.to(driver.socketId).emit("ride-request", {
                    rideId: newRide.rideId,
                    dbId: newRide._id,
                    passengerId,
                    passengerName: data.passengerName,
                    pickup,
                    destination,
                    fare,
                    distance: data.distance,
                    isSharedRide
                });
            });

            console.log(`🚕 ${isSharedRide ? 'Shared' : 'Private'} taxi request ${newRide.rideId} broadcast to ${nearbyDrivers.length} drivers`);
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

    socket.on("get-available-carpools", async () => {
        try {
            const pools = await Ride.find({ 
                type: 'CARPOOL', 
                status: 'SEARCHING',
                availableSeats: { $gt: 0 }
            }).limit(10);
            socket.emit("available-carpools", pools);
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
            console.log(`🚕 Taxi ride ${rideId} accepted by driver ${driverId}`);
        } catch (error) {
            console.error("Taxi accept error:", error);
        }
    });
};
