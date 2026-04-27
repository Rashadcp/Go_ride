import { Response } from "express";
import EmergencyReport from "../../models/emergencyReport";
import Ride from "../../models/ride";
import asyncHandler from "express-async-handler";

export const reportEmergency = asyncHandler(async (req: any, res: Response) => {
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

    res.status(201).json({ message: "Emergency reported successfully", report });
});

export const getMyReports = asyncHandler(async (req: any, res: Response) => {
    const reports = await EmergencyReport.find({ reporterId: req.user.id }).sort({ createdAt: -1 });
    res.json(reports);
});
