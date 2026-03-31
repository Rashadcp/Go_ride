import { Router } from "express";
import { 
    getNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
} from "./notification.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
