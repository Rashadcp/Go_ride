"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEmergencyHandlers = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const emergencyReport_1 = __importDefault(require("../../models/emergencyReport"));
const ride_1 = __importDefault(require("../../models/ride"));
const registerEmergencyHandlers = (io, socket) => {
    // Ride Emergency (Alert User -> Server -> Admin/Authorities)
    socket.on("ride:emergency", async (data) => {
        try {
            console.log("🚨 EMERGENCY ALERT TRIGGERED:", data);
            let resolvedRideId = null;
            if (data.rideId) {
                if (mongoose_1.default.isValidObjectId(data.rideId)) {
                    resolvedRideId = data.rideId;
                }
                else {
                    // It's a custom rideId string like RIDE-123, find the DB _id
                    const ride = await ride_1.default.findOne({ rideId: data.rideId });
                    if (ride)
                        resolvedRideId = ride._id;
                }
            }
            const report = new emergencyReport_1.default({
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
        }
        catch (error) {
            console.error("Emergency socket error:", error);
            socket.emit("ride:emergency:received", { success: false });
        }
    });
};
exports.registerEmergencyHandlers = registerEmergencyHandlers;
