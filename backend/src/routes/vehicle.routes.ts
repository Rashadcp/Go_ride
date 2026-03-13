import express from "express";
import { 
    getMyVehicle, 
    createVehicle, 
    updateVehicle, 
    deleteVehicle 
} from "../controllers/vehicle.controller";
import { protect } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.get("/me", protect, getMyVehicle);
router.post("/", protect, upload.fields([
    { name: "rc", maxCount: 1 },
    { name: "vehiclePhoto", maxCount: 1 }
]), createVehicle);
router.put("/", protect, upload.fields([
    { name: "rc", maxCount: 1 },
    { name: "vehiclePhoto", maxCount: 1 }
]), updateVehicle);
router.delete("/", protect, deleteVehicle);

export default router;
