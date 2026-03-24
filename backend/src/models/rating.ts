import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
    {
        rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // person who rated
        targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // person being rated (driver or passenger)
        rating: { type: Number, min: 1, max: 5, required: true },
        feedback: { type: String, default: "" },
    },
    { timestamps: true }
);

export default mongoose.model("Rating", ratingSchema);
