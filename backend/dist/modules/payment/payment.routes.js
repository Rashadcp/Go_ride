"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("./payment.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/create", auth_middleware_1.protect, payment_controller_1.createPayment);
router.post("/verify", auth_middleware_1.protect, payment_controller_1.verifyPayment);
router.get("/transactions", auth_middleware_1.protect, payment_controller_1.getTransactions);
exports.default = router;
