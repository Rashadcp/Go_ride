import express from "express";
import { createRating, getRatings } from "./rating.controller";
import { protect } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/", protect, createRating);
router.post("/submit", protect, createRating);
router.get("/my-ratings", protect, getRatings);

export default router;
