import mongoose from "mongoose";

const DiscountSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ["PERCENTAGE", "FLAT"], required: true },
    value: { type: Number, required: true },
    maxUsage: { type: Number, default: 100 },
    currentUsage: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
    description: { type: String }
}, { timestamps: true });

export default mongoose.model("Discount", DiscountSchema);
