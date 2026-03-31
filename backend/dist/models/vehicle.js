"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const vehicleSchema = new mongoose_1.default.Schema({
    ownerId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    numberPlate: {
        type: String,
        required: true,
        unique: true,
    },
    vehicleModel: String,
    vehicleType: {
        type: String,
        enum: {
            values: ["Go", "Sedan", "XL", "Auto", "Bike", "Luxury", "Tavera"],
            message: "{VALUE} is not a valid vehicle type."
        },
    },
    rc: String, // Registration Certificate (Vehicle specific)
    vehiclePhotos: [String], // Car Photos
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Vehicle", vehicleSchema);
