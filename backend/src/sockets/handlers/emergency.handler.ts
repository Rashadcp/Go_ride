import { Server, Socket } from "socket.io";
import EmergencyReport from "../../models/emergencyReport";

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
            
            const report = new EmergencyReport({
                reporterId: data.userId,
                rideId: data.rideId || undefined,
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
