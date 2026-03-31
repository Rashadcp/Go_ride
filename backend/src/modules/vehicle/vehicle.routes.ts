import express from "express";
import { 
    getMyVehicle, 
    createVehicle, 
    updateVehicle, 
    deleteVehicle 
} from "./vehicle.controller";
import { protect } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";

const router = express.Router();

router.get("/me", protect, getMyVehicle);
router.post("/", protect, upload.fields([
    { name: "rc", maxCount: 1 },
    { name: "vehiclePhotos", maxCount: 5 }
]), createVehicle);
router.put("/", protect, upload.fields([
    { name: "rc", maxCount: 1 },
    { name: "vehiclePhotos", maxCount: 5 }
]), updateVehicle);
router.delete("/", protect, deleteVehicle);

export default router;
