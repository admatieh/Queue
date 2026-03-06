/**
 * JWT Authentication Middleware
 *
 * Strategy: stateless JWT Bearer tokens.
 * - Login/register → server signs a JWT (HS256) → client stores in memory
 * - Every request sends Authorization: Bearer <token>
 * - Server validates the token on every request — no session lookup needed
 *
 * Guard functions: requireAuth, requireAdmin, requireSuperAdmin, requireVenueAccess
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { User } from "@shared/schema";
import { AdminVenueAssignmentModel } from "../models/AdminVenueAssignment";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "queuebuddy_dev_jwt_secret_change_in_prod";
const JWT_EXPIRES_IN = "24h";

export interface JwtPayload {
    id: string;
    email: string;
    role: string;
    status: string;
}

/** Sign a JWT for a user.  Call this after successful login or registration. */
export function signToken(user: Pick<User, "id" | "email" | "role" | "status">): string {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, status: user.status } as JwtPayload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" }
    );
}

/** Verify a JWT string. Returns the payload or null if invalid/expired. */
export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * Middleware to decode the JWT from the Authorization header and attach
 * the payload to req.user. Returns 401 if missing or invalid.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    if (!payload) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }

    if (payload.status === "disabled") {
        res.status(403).json({ message: "Account disabled" });
        return;
    }

    // Attach to req.user so controllers can read it
    req.user = payload as unknown as User;
    next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    requireAuth(req, res, () => {
        const role = (req.user as User).role;
        if (role !== "admin" && role !== "super_admin") {
            res.status(403).json({ message: "Admin access required" });
            return;
        }
        next();
    });
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
    requireAuth(req, res, () => {
        const role = (req.user as User).role;
        if (role !== "super_admin") {
            res.status(403).json({ message: "Super Admin access required" });
            return;
        }
        next();
    });
};

export const requireVenueAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    requireAdmin(req, res, async () => {
        const user = req.user as User;

        // Super admins bypass venue assignment check
        if (user.role === "super_admin") {
            return next();
        }

        const venueId = req.params.id || req.body.venueId;
        if (!venueId) {
            res.status(400).json({ message: "Venue ID is required" });
            return;
        }

        const assignment = await AdminVenueAssignmentModel.findOne({
            adminId: user.id,
            venueId: venueId,
        });

        if (!assignment) {
            res.status(403).json({ message: "Access denied for this venue" });
            return;
        }

        next();
    });
};

/** No-op for backwards compatibility — JWT needs no session setup */
export function setupAuth(_app: any): void {
    // JWT is stateless — nothing to set up at the express app level
}
