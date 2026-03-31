"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const EmergencyReportSchema = new mongoose_1.default.Schema({
    reporterId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    rideId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Ride" }, // Optional for now
    driverId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" }, // Target driver being reported
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
exports.default = mongoose_1.default.model("EmergencyReport", EmergencyReportSchema);
