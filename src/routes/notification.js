import express from "express";
import NotificationController from "../controllers/NotificationController.js";
import authMiddleware from "../middlewares/authentication.js";

const router = express.Router();

router.get("/", authMiddleware.verifyToken, NotificationController.getNotifications);
router.get("/unread-count", authMiddleware.verifyToken, NotificationController.getUnreadCount);
router.patch("/:notificationId/read", authMiddleware.verifyToken, NotificationController.markAsRead);
router.patch("/mark-all-read", authMiddleware.verifyToken, NotificationController.markAllAsRead);
router.delete("/:notificationId", authMiddleware.verifyToken, NotificationController.deleteNotification);

export default router;
