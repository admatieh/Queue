import type { Server } from "http";
import authRoutes from "./auth.routes";
import venueRoutes from "./venue.routes";
import reservationRoutes from "./reservation.routes";
import adminRoutes from "./admin.routes";
import { serveStatic } from "../config/static";
import path from "path";
import express, { type Express } from "express";
import notificationRoutes from "./Notification.routes";
import cookieParser from "cookie-parser";




export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === HEALTH CHECK ===
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
    app.use(cookieParser());
    app.use("/api/notifications", notificationRoutes);
  // === PARSERS ===
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Serve static uploads
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // === API ROUTES ===
  app.use("/api/auth", authRoutes);        // Auth
  app.use("/", venueRoutes);               // Venues
  app.use("/", reservationRoutes);         // Reservations
  app.use("/", adminRoutes);               // Admin

  // Serve frontend in production
  if (app.get("env") === "production") {
    serveStatic(app);
  }

  return httpServer;
}