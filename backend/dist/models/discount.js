"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const DiscountSchema = new mongoose_1.default.Schema({
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ["PERCENTAGE", "FLAT"], required: true },
    value: { type: Number, required: true },
    maxUsage: { type: Number, default: 100 },
    currentUsage: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true }, // Whether users can see this in their dashboard
    description: { type: String }
}, { timestamps: true });
exports.default = mongoose_1.default.model("Discount", DiscountSchema);
