import { Router } from "express";
import { 
    getNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
} from "../controllers/notification.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/:id", deleteNotification);

export default router;
