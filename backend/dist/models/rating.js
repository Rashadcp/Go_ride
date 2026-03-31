"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ratingSchema = new mongoose_1.default.Schema({
    rideId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Ride', required: true },
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true }, // person who rated
    targetId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true }, // person being rated (driver or passenger)
    rating: { type: Number, min: 1, max: 5, required: true },
    feedback: { type: String, default: "" },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Rating", ratingSchema);
