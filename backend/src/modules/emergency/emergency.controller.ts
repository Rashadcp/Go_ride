import { Response } from "express";
import EmergencyReport from "../../models/emergencyReport";
import Ride from "../../models/ride";

export const reportEmergency = async (req: any, res: Response) => {
    try {
        const { rideId, type, description, location } = req.body;
        
        const report = new EmergencyReport({
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
    } catch (err: any) {
        res.status(500).json({ message: "Error reporting emergency", error: err.message });
    }
};

export const getMyReports = async (req: any, res: Response) => {
    try {
        const reports = await EmergencyReport.find({ reporterId: req.user.id }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (err: any) {
        res.status(500).json({ message: "Error fetching emergency reports" });
    }
};
