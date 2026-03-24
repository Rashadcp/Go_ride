import express from "express";
import { requestTaxi, getTaxiHistory } from "./taxi.controller";
import { protect } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/request", protect, requestTaxi);
router.get("/history", protect, getTaxiHistory);

export default router;
