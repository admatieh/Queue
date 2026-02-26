import { Request, Response, NextFunction } from "express";
import { storage } from "../services/storage.service";
import { hashPassword, comparePasswords } from "../utils/crypto";
import jwt from "jsonwebtoken";

const generateToken = (user: any) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1d" }
  );

// --- LOGIN ---
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await storage.getUserByEmail(email);
  if (!user || !(await comparePasswords(password, user.password as string))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // true in production (HTTPS)
    sameSite: "lax",
  });

  res.json({ user });
};

// --- REGISTER ---
export const register = async (req: Request, res: Response) => {
  const existingUser = await storage.getUserByEmail(req.body.email);
  if (existingUser) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const hashed = await hashPassword(req.body.password);
  const user = await storage.createUser({
    ...req.body,
    password: hashed,
  });

  const token = generateToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.status(201).json({ user });
};

// --- LOGOUT ---
export const logout = (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.sendStatus(200);
};

// --- ME ---
export const me = (req: any, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  res.json(req.user);
};
export const createAdmin = async (req: any, res: Response) => {
  try {
    const { email, password, ...rest } = req.body;

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashed = await hashPassword(password);

    const user = await storage.createUser({
      ...rest,
      email,
      password: hashed,
      role: "admin",
    });

    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to create admin" });
  }
};