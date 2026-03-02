import { Request, Response, NextFunction } from "express";
import { storage } from "../services/storage.service";
import { hashPassword, comparePasswords } from "../utils/crypto";
import { signToken } from "../middleware/auth.middleware";

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const existingUser = await storage.getUserByEmail(req.body.email);
        if (existingUser) {
            return res.status(409).json({ message: "Email already in use" });
        }

        const hashedPassword = await hashPassword(req.body.password);
        const user = await storage.createUser({
            ...req.body,
            password: hashedPassword,
        });

        const token = signToken(user as any);
        // Return both user (without password) and token
        const { password: _pw, ...safeUser } = user as any;
        res.status(201).json({ ...safeUser, token });
    } catch (err) {
        next(err);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await storage.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const storedHash = (user as any).password as string;
        if (!storedHash) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const valid = await comparePasswords(password, storedHash);
        if (!valid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if ((user as any).status === "disabled") {
            return res.status(403).json({ message: "Account disabled" });
        }

        const token = signToken(user as any);
        const { password: _pw, ...safeUser } = user as any;
        res.status(200).json({ ...safeUser, token });
    } catch (err) {
        next(err);
    }
};

export const logout = (_req: Request, res: Response) => {
    // JWT is stateless — client just discards the token
    res.sendStatus(200);
};

export const me = (req: Request, res: Response) => {
    // req.user is set by requireAuth middleware (JWT payload)
    res.json(req.user);
};
