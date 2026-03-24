import express from "express";
import { reportEmergency, getMyReports } from "./emergency.controller";
import { protect } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/report", protect, reportEmergency);
router.get("/my-reports", protect, getMyReports);

export default router;
