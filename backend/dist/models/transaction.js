"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const transactionSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    rideId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Ride', required: false },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'SUCCESS' },
    method: { type: String, enum: ['ONLINE', 'WALLET', 'CASH'], default: 'WALLET' },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Transaction", transactionSchema);
