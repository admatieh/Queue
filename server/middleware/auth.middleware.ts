import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "../services/storage.service";
import { User } from "@shared/schema";
import { createRequire } from "module";
import { comparePasswords } from "../utils/crypto";

const require = createRequire(import.meta.url);
const MemoryStore = require("memorystore")(session);

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET || "queuebuddy_secret",
        resave: false,
        saveUninitialized: false,
        store: new MemoryStore({
            checkPeriod: 86400000,
        }),
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: app.get("env") === "production"
        }
    };

    if (app.get("env") === "production") {
        app.set("trust proxy", 1);
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(
            { usernameField: "email" }, // Use email as username
            async (email, password, done) => {
                try {
                    const user = await storage.getUserByEmail(email);
                    if (!user || !(await comparePasswords(password, user.password as string))) {
                        return done(null, false, { message: "Invalid email or password" });
                    }
                    if (user.status === "disabled") {
                        return done(null, false, { message: "Account disabled" });
                    }
                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            },
        ),
    );

    passport.serializeUser((user, done) => done(null, (user as User).id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await storage.getUser(id as string);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
}

import { AdminVenueAssignmentModel } from "../models/AdminVenueAssignment";

// Global Auth Guards
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
        console.warn("[AUTH] requireAuth failed: Not authenticated. Path:", req.path);
        return res.status(401).json({ message: "Unauthorized" });
    }
    if ((req.user as User).status === "disabled") {
        console.warn("[AUTH] requireAuth failed: Account disabled");
        req.logout((err) => {
            return res.status(403).json({ message: "Account disabled" });
        });
        return;
    }
    next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
        const role = (req.user as User).role;
        if (role !== "admin" && role !== "super_admin") {
            console.warn(`[AUTH] requireAdmin failed: Found role ${role}`);
            return res.status(403).json({ message: "Admin access required" });
        }
        next();
    });
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
        const role = (req.user as User).role;
        if (role !== "super_admin") {
            console.warn(`[AUTH] requireSuperAdmin failed: Found role ${role}`);
            return res.status(403).json({ message: "Super Admin access required" });
        }
        next();
    });
};

export const requireVenueAccess = async (req: Request, res: Response, next: NextFunction) => {
    requireAdmin(req, res, async () => {
        const user = req.user as User;

        // Super admins have access to all venues
        if (user.role === "super_admin") {
            return next();
        }

        const venueId = req.params.id || req.body.venueId;
        if (!venueId) {
            return res.status(400).json({ message: "Venue ID is required" });
        }

        // Check assigned venues via mapping table
        const assignment = await AdminVenueAssignmentModel.findOne({
            adminId: user.id,
            venueId: venueId
        });

        if (!assignment) {
            return res.status(403).json({ message: "Access denied for this venue" });
        }

        next();
    });
};
