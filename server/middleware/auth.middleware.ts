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

// Global Auth Guards
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || (req.user as User).role !== "admin") {
        return res.status(401).json({ message: "Admin access required" });
    }
    next();
};
