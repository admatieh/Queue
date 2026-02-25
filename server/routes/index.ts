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

    // Set up authentication (passport)
    setupAuth(app);

    // Api Routes
    // Note: @shared/routes specifies paths like '/api/venues'.
    // We mount at '/' so the full paths from shared schema naturally match.
    // Exception: auth routes don't exist in @shared/routes, manually prefix them.
    app.use("/api/auth", authRoutes);

    // Mount other feature routers at root '/'
    app.use("/", venueRoutes);
    app.use("/", reservationRoutes);
    app.use("/api/admin", adminRoutes);

    return httpServer;
}
