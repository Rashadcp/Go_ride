"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vehicle_controller_1 = require("./vehicle.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const upload_middleware_1 = require("../../middleware/upload.middleware");
const router = express_1.default.Router();
router.get("/me", auth_middleware_1.protect, vehicle_controller_1.getMyVehicle);
router.post("/", auth_middleware_1.protect, upload_middleware_1.upload.fields([
    { name: "rc", maxCount: 1 },
    { name: "vehiclePhotos", maxCount: 5 }
]), vehicle_controller_1.createVehicle);
router.put("/", auth_middleware_1.protect, upload_middleware_1.upload.fields([
    { name: "rc", maxCount: 1 },
    { name: "vehiclePhotos", maxCount: 5 }
]), vehicle_controller_1.updateVehicle);
router.delete("/", auth_middleware_1.protect, vehicle_controller_1.deleteVehicle);
exports.default = router;
