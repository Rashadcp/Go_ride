"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyReports = exports.reportEmergency = void 0;
const emergencyReport_1 = __importDefault(require("../../models/emergencyReport"));
const reportEmergency = async (req, res) => {
    try {
        const { rideId, type, description, location } = req.body;
        const report = new emergencyReport_1.default({
            reporterId: req.user.id,
            rideId,
            type,
            description,
            location,
            status: "PENDING"
        });
        await report.save();
        // Socket alert to admins (future)
        // For now just return success
        res.status(201).json({ message: "Emergency reported successfully", report });
    }
    catch (err) {
        res.status(500).json({ message: "Error reporting emergency", error: err.message });
    }
};
exports.reportEmergency = reportEmergency;
const getMyReports = async (req, res) => {
    try {
        const reports = await emergencyReport_1.default.find({ reporterId: req.user.id }).sort({ createdAt: -1 });
        res.json(reports);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching emergency reports" });
    }
};
exports.getMyReports = getMyReports;
