import express from "express";
import { requestTaxi, getTaxiHistory, getPendingDriverRequests } from "./taxi.controller";
import { protect } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/request", protect, requestTaxi);
router.post("/pending-requests", protect, getPendingDriverRequests);
router.get("/history", protect, getTaxiHistory);

export default router;
