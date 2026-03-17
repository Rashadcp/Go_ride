import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
    {
        rideId: {
            type: String,
            required: true,
            unique: true,
        },
        passengerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // Will be set when driver accepts
        },
        status: {
            type: String,
            enum: ["REQUESTED", "SEARCHING", "ACCEPTED", "ARRIVED", "STARTED", "COMPLETED", "CANCELLED"],
            default: "REQUESTED",
        },
        pickup: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            label: { type: String, default: "Pickup Location" },
        },
        destination: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            label: { type: String, default: "Destination" },
        },
        rideType: {
            type: String,
            enum: ["taxi", "shared"],
            default: "taxi",
        },
        requestedVehicleType: {
            type: String,
            enum: ["bike", "auto", "car"],
            default: "car",
        },
        fare: {
            type: Number,
            required: true,
        },
        distance: {
            type: Number, // in km
            required: true,
        },
        duration: {
            type: Number, // in minutes
            required: true,
        },
        candidateDrivers: [{
            driverId: mongoose.Schema.Types.ObjectId,
            status: {
                type: String,
                enum: ["PENDING", "ACCEPTED", "REJECTED"],
                default: "PENDING",
            },
            rejectedAt: Date,
        }],
        acceptedAt: Date,
        startedAt: Date,
        completedAt: Date,
        cancelledAt: Date,
        driverLocation: {
            lat: Number,
            lng: Number,
        },
        eta: {
            type: Number, // ETA in minutes to pickup
        },
    },
    { timestamps: true }
);

// Index for efficient queries
rideSchema.index({ passengerId: 1, status: 1 });
rideSchema.index({ driverId: 1, status: 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ rideId: 1 });

export default mongoose.model("Ride", rideSchema);