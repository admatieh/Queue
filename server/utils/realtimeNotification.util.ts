import { io } from "../index";

export const sendRealtimeNotification = (userId: string, notification: any) => {
  io.to(userId).emit("new-notification", notification);
};