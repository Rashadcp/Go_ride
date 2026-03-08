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
        rc: String, // Registration Certificate (Vehicle specific)
        vehiclePhoto: String, // Car Photo
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
        },
    },
    { timestamps: true }
);

export default mongoose.model("Vehicle", vehicleSchema);
