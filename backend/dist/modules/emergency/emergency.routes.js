"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const emergency_controller_1 = require("./emergency.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/report", auth_middleware_1.protect, emergency_controller_1.reportEmergency);
router.get("/my-reports", auth_middleware_1.protect, emergency_controller_1.getMyReports);
exports.default = router;
