import express from "express";
import { createPayment, verifyPayment } from "./payment.controller";
import { protect } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/create", protect, createPayment);
router.post("/verify", protect, verifyPayment);

export default router;
