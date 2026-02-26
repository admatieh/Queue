import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/jwt.middleware";
const router = Router();

// PUBLIC
router.post("/register", authController.register);
router.post("/login", authController.login);

// LOGOUT
router.post("/logout", authController.logout);

// CURRENT USER
router.get("/me", requireAuth, authController.me);

// SUPERADMIN creates admin
router.post("/admin", requireAuth, requireRole("superadmin"), authController.createAdmin);

export default router;