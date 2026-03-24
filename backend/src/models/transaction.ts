import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: false },
        type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
        amount: { type: Number, required: true },
        description: { type: String, required: true },
        status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'SUCCESS' },
        method: { type: String, enum: ['ONLINE', 'WALLET', 'CASH'], default: 'WALLET' },
    },
    { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
