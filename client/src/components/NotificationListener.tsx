import { useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";

const socket = io("http://localhost:5000");

export const NotificationListener = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    socket.emit("register", user.id);

    socket.on("new-notification", (notification) => {
      toast({
        title: "Notification",
        description: notification.message,
      });
    });

    return () => {
      socket.off("new-notification");
    };
  }, [user]);

  return null;
};