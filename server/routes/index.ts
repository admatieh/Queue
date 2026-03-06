import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "../middleware/auth.middleware";

import authRoutes from "./auth.routes";
import venueRoutes from "./venue.routes";
import reservationRoutes from "./reservation.routes";
import adminRoutes from "./admin.routes";

export async function registerRoutes(
    httpServer: Server,
    app: Express
): Promise<Server> {
    // === HEALTH ===
    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok" });
    });

    // JWT is stateless — setupAuth is a no-op but kept for structure
    setupAuth(app);

    // Auth routes (login / register / logout / me)
    app.use("/api/auth", authRoutes);

    // Feature routes
    app.use("/", venueRoutes);
    app.use("/", reservationRoutes);
    app.use("/api/admin", adminRoutes);

    return httpServer;
}
