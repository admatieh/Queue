import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { storage } from "../services/storage.service";
import { hashPassword } from "../utils/crypto";

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const existingUser = await storage.getUserByEmail(req.body.email);
        if (existingUser) {
            return res.status(409).send("Email already in use");
        }

        const hashedPassword = await hashPassword(req.body.password);
        const user = await storage.createUser({
            ...req.body,
            password: hashedPassword,
        });

        req.login(user, (err) => {
            if (err) return next(err);
            res.status(201).json(user);
        });
    } catch (err) {
        next(err);
    }
};

export const login = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) return next(err);
        if (!user) return res.status(401).send(info?.message || "Login failed");
        req.login(user, (err) => {
            if (err) return next(err);
            res.status(200).json(user);
        });
    })(req, res, next);
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
        if (err) return next(err);
        res.sendStatus(200);
    });
};

export const me = (req: Request, res: Response) => {
    res.json(req.user);
};
