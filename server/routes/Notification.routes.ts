import { Router } from "express";
import { NotificationModel } from "../models/Notifications";

const router = Router();

// Get all notifications for a user
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const notifications = await NotificationModel.find({ userId }).sort({ createdAt: -1 });
  res.json(notifications);
});

// Mark notification as read
router.put("/read/:id", async (req, res) => {
  const { id } = req.params;
  const notification = await NotificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true });
  res.json(notification);
});

export default router;