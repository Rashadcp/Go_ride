import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import EmergencyReport from "../../models/emergencyReport";
import Ride from "../../models/ride";

export const registerEmergencyHandlers = (io: Server, socket: Socket) => {
    // Ride Emergency (Alert User -> Server -> Admin/Authorities)
    socket.on("ride:emergency", async (data: {
        rideId: string;
        userId: string;
        location: any;
        message: string;
        type: "ACCIDENT" | "HARASSMENT" | "THEFT" | "OTHER";
        driverName?: string;
        driverId?: string;
    }) => {
        try {
            console.log("🚨 EMERGENCY ALERT TRIGGERED:", data);
            
            let resolvedRideId = null;
            if (data.rideId) {
                if (mongoose.isValidObjectId(data.rideId)) {
                    resolvedRideId = data.rideId;
                } else {
                    // It's a custom rideId string like RIDE-123, find the DB _id
                    const ride = await Ride.findOne({ rideId: data.rideId });
                    if (ride) resolvedRideId = ride._id;
                }
            }

            const report = new EmergencyReport({
                reporterId: data.userId,
                rideId: resolvedRideId || undefined,
                driverId: data.driverId || undefined,
                type: data.type || "OTHER",
                description: data.message,
                location: data.location,
                status: "PENDING"
            });
            await report.save();

            // Populate reporter for admin broadcast
            await report.populate("reporterId", "name email phone");

            // Broadcast full alert to all admins
            io.emit("admin:emergency:alert", {
                ...report.toObject(),
                driverName: data.driverName,
                driverId: data.driverId,
            });
            
            // Confirm to sender
            socket.emit("ride:emergency:received", { success: true, reportId: report._id });
            console.log(`🚨 Emergency report saved: ${report._id} | Type: ${data.type}`);
        } catch (error) {
            console.error("Emergency socket error:", error);
            socket.emit("ride:emergency:received", { success: false });
        }
    });
};
