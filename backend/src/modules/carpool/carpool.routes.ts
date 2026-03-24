import express from "express";
import { createCarpool, searchCarpools, joinCarpool } from "./carpool.controller";
import { protect } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/create", protect, createCarpool);
router.get("/search", protect, searchCarpools);
router.post("/:rideId/join", protect, joinCarpool);

export default router;
