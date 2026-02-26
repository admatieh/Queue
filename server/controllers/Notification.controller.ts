import { Request, Response } from "express";
import { NotificationModel } from "../models/Notifications";
import { createNotification } from "../utils/Notification.utils";
import { sendRealtimeNotification } from "../utils/realtimeNotification.util";

// Get all notifications for a user
export const getNotifications = async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const notifications = await NotificationModel.find({ userId: user.id }).sort({ createdAt: -1 });
  res.json(notifications);
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  const user = req.user as any;
  const id = req.params.id;

  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const notification = await NotificationModel.findOneAndUpdate(
    { _id: id, userId: user.id },
    { isRead: true },
    { new: true }
  );

  if (!notification) return res.status(404).json({ message: "Notification not found" });

  res.json(notification);
};

// Optional: Create a notification manually (admin or system)
export const sendNotification = async (req: Request, res: Response) => {
  const { userId, type, message } = req.body;

  const notification = await createNotification(userId, type, message);

  sendRealtimeNotification(userId.toString(), notification);

  res.status(201).json(notification);
};