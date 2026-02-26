import { NotificationModel, INotification } from "../models/Notifications";

export const createNotification = async (
  userId: string,
  type: INotification["type"],
  message: string
): Promise<INotification> => {
  const notification = await NotificationModel.create({ userId, type, message });
  return notification;
};