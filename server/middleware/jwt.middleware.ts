// jwt.middleware.ts
import { Request, Response, NextFunction } from "express";

// Extend Express request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

// JWT Auth check
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET!);
    req.user = decoded as { id: string; role: string };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Generic role check
export const requireRole = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  next();
};

// Optional convenience for admins only
export const requireAdmin = requireRole("admin");