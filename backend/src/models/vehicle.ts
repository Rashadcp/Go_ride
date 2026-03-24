import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
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
    },
    { timestamps: true }
);

export default mongoose.model("Vehicle", vehicleSchema);
