import mongoose from "mongoose";

const EmergencyReportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" }, // Optional for now
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Target driver being reported
    type: { type: String, enum: ["ACCIDENT", "HARASSMENT", "THEFT", "OTHER"], required: true },
    description: { type: String, required: true },
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    status: { type: String, enum: ["PENDING", "INVESTIGATING", "RESOLVED"], default: "PENDING" },
    resolutionNotes: { type: String },
}, { timestamps: true });

export default mongoose.model("EmergencyReport", EmergencyReportSchema);
