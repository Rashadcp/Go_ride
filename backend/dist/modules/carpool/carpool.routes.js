"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const carpool_controller_1 = require("./carpool.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/create", auth_middleware_1.protect, carpool_controller_1.createCarpool);
router.get("/search", auth_middleware_1.protect, carpool_controller_1.searchCarpools);
router.post("/:rideId/join", auth_middleware_1.protect, carpool_controller_1.joinCarpool);
exports.default = router;
