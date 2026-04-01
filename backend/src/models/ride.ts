import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
    {
        rideId: {
            type: String,
            required: true,
            unique: true,
        },
        type: {
            type: String,
            enum: ["TAXI", "CARPOOL"],
            required: true,
            uppercase: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        status: {
            type: String,
            enum: ["SEARCHING", "ACCEPTED", "ARRIVED", "STARTED", "COMPLETED", "CANCELLED", "OPEN", "FULL", "NO_DRIVER"],
            default: "SEARCHING",
            uppercase: true,
        },
        pickup: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            label: { type: String, default: "Pickup Location" },
            location: {
                type: { type: String, enum: ['Point'], default: 'Point' },
                coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
            }
        },
        drop: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            label: { type: String, default: "Destination" },
            location: {
                type: { type: String, enum: ['Point'], default: 'Point' },
                coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
            }
        },
        requestedVehicleType: {
            type: String,
            enum: ["bike", "auto", "car", "go", "sedan", "xl"],
            default: "car",
        },
        passengers: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            name: String,
            photo: String,
            seats: Number,
            paymentMethod: {
                type: String,
                enum: ["WALLET", "CASH", "UPI"],
                default: "CASH",
            },
            joinedAt: { type: Date, default: Date.now }
        }],
        availableSeats: {
            type: Number,
            default: 1,
        },
        departureTime: {
            type: Date,
            default: null,
        },
        price: {
            type: Number,
            required: true,
        },
        pricePerSeat: {
            type: Number,
            default: 0,
        },
        distance: {
            type: Number,
            required: true,
        },
        duration: {
            type: Number,
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
        arrivedAt: Date,
        startedAt: Date,
        completedAt: Date,
        cancelledAt: Date,
        driverLocation: {
            lat: Number,
            lng: Number,
        },
        eta: {
            type: Number,
        },
        paymentMethod: {
            type: String,
            enum: ["WALLET", "CASH", "UPI"],
            default: "WALLET",
        },
        isSharedRide: {
            type: Boolean,
            default: false,
        },
        originalPrice: {
            type: Number,
            required: false,
        },
        promoCode: {
            type: String,
            default: null,
        },
        discountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Discount",
            default: null,
        },
    },
    { timestamps: true }
);

// Proxies for legacy compatibility (if needed)
rideSchema.virtual('passengerId').get(function() { return this.createdBy; });
rideSchema.virtual('destination').get(function() { return this.drop; });
rideSchema.virtual('rideType').get(function() { return this.type?.toLowerCase(); });
rideSchema.set('toJSON', { virtuals: true });
rideSchema.set('toObject', { virtuals: true });

rideSchema.index({ createdBy: 1, status: 1 });
rideSchema.index({ driverId: 1, status: 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ "pickup.location": "2dsphere" });
rideSchema.index({ "drop.location": "2dsphere" });
rideSchema.index({ type: 1 });

export default mongoose.model("Ride", rideSchema);
