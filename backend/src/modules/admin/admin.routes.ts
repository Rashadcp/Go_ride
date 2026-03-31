import express from "express";
import { 
    getPendingDrivers, 
    approveDriver, 
    getAllDrivers, 
    getDashboardStats, 
    deleteDriver,
    getAllUsers,
    getEmergencyReports,
    resolveEmergencyReport,
    getDiscounts,
    createDiscount,
    deleteDiscount,
    getAllTransactions,
    toggleBlockUser,
    toggleFlagSuspicious,
    softDeleteUser,
    getUserRideHistory,
    updateUser,
    sendNotification
} from "./admin.controller";
import { protect, adminProtect } from "../../common/middleware/auth.middleware";

const router = express.Router();

router.get("/stats", protect, adminProtect, getDashboardStats);
router.get("/drivers", protect, adminProtect, getAllDrivers);
router.get("/pending-drivers", protect, adminProtect, getPendingDrivers);
router.put("/approve-driver/:vehicleId", protect, adminProtect, approveDriver);
router.delete("/driver/:id", protect, adminProtect, deleteDriver);

// User Management
router.get("/users", protect, adminProtect, getAllUsers);
router.put("/users/block/:id", protect, adminProtect, toggleBlockUser);
router.put("/users/flag/:id", protect, adminProtect, toggleFlagSuspicious);
router.put("/users/:id", protect, adminProtect, updateUser);
router.delete("/users/:id", protect, adminProtect, softDeleteUser);
router.get("/users/ride-history/:id", protect, adminProtect, getUserRideHistory);

// Emergency Reports
router.get("/emergency-reports", protect, adminProtect, getEmergencyReports);
router.put("/emergency-reports/:id", protect, adminProtect, resolveEmergencyReport);

// Discounts & Revenue
router.get("/discounts", protect, adminProtect, getDiscounts);
router.post("/discounts", protect, adminProtect, createDiscount);
router.delete("/discounts/:id", protect, adminProtect, deleteDiscount);
router.get("/transactions", protect, adminProtect, getAllTransactions);

// Notifications
router.post("/notifications", protect, adminProtect, sendNotification);

export default router;
