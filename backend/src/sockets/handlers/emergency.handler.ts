import { Server, Socket } from "socket.io";
import EmergencyReport from "../../models/emergencyReport";

export const registerEmergencyHandlers = (io: Server, socket: Socket) => {
    // Ride Emergency (Alert User -> Server -> Admin/Authorities)
    socket.on("ride:emergency", async (data: { rideId: string; userId: string; location: any; message: string }) => {
        try {
            console.log("🚨 EMERGENCY ALERT TRIGGERED:", data);
            
            const report = new EmergencyReport({
                reporterId: data.userId,
                rideId: data.rideId,
                description: data.message,
                location: data.location,
                status: "PENDING"
            });
            await report.save();

            // Broadcast to all admins (future)
            io.emit("admin:emergency:alert", report);
            
            // Confirm to sender
            socket.emit("ride:emergency:received", { success: true, reportId: report._id });
        } catch (error) {
            console.error("Emergency socket error:", error);
        }
    });
};
