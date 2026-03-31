"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("./admin.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const router = express_1.default.Router();
router.get("/stats", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.getDashboardStats);
router.get("/drivers", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.getAllDrivers);
router.get("/pending-drivers", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.getPendingDrivers);
router.put("/approve-driver/:vehicleId", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.approveDriver);
router.delete("/driver/:id", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.deleteDriver);
// User Management
router.get("/users", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.getAllUsers);
router.put("/users/block/:id", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.toggleBlockUser);
router.put("/users/flag/:id", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.toggleFlagSuspicious);
router.put("/users/:id", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.updateUser);
router.delete("/users/:id", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.softDeleteUser);
router.get("/users/ride-history/:id", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.getUserRideHistory);
// Emergency Reports
router.get("/emergency-reports", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.getEmergencyReports);
router.put("/emergency-reports/:id", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.resolveEmergencyReport);
// Discounts & Revenue
router.get("/discounts", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.getDiscounts);
router.post("/discounts", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.createDiscount);
router.delete("/discounts/:id", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.deleteDiscount);
router.get("/transactions", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.getAllTransactions);
// Notifications
router.post("/notifications", auth_middleware_1.protect, auth_middleware_1.adminProtect, admin_controller_1.sendNotification);
exports.default = router;
