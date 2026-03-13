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
    getAllTransactions
} from "../controllers/admin.controller";
import { protect, adminProtect } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/stats", protect, adminProtect, getDashboardStats);
router.get("/drivers", protect, adminProtect, getAllDrivers);
router.get("/pending-drivers", protect, adminProtect, getPendingDrivers);
router.put("/approve-driver/:vehicleId", protect, adminProtect, approveDriver);
router.delete("/driver/:id", protect, adminProtect, deleteDriver);

// New Routes
router.get("/users", protect, adminProtect, getAllUsers);
router.get("/emergency-reports", protect, adminProtect, getEmergencyReports);
router.put("/emergency-reports/:id", protect, adminProtect, resolveEmergencyReport);
router.get("/discounts", protect, adminProtect, getDiscounts);
router.post("/discounts", protect, adminProtect, createDiscount);
router.delete("/discounts/:id", protect, adminProtect, deleteDiscount);
router.get("/transactions", protect, adminProtect, getAllTransactions);

export default router;
