"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const taxi_controller_1 = require("./taxi.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/request", auth_middleware_1.protect, taxi_controller_1.requestTaxi);
router.get("/history", auth_middleware_1.protect, taxi_controller_1.getTaxiHistory);
exports.default = router;
