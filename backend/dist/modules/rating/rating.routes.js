"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rating_controller_1 = require("./rating.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/", auth_middleware_1.protect, rating_controller_1.createRating);
router.post("/submit", auth_middleware_1.protect, rating_controller_1.createRating);
router.get("/my-ratings", auth_middleware_1.protect, rating_controller_1.getRatings);
exports.default = router;
