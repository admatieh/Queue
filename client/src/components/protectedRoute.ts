import express from "express";
import { requireAuth } from "server/middleware/auth.middleware";
import { requireRole } from "server/middleware/jwt.middleware";
const router = express.Router();

// 👤 User-only route
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// 🛡 Admin-only route
router.get(
  "/admin-data",
  requireAuth,
  requireRole("admin", "superadmin"),
  (req, res) => {
    res.json({ secret: "admin info" });
  }
);

// Superadmin-only route
router.post(
  "/create-admin",
  requireAuth,
  requireRole("superadmin"),
  async (req, res) => {
    // your superadmin logic here
    res.json({ message: "Admin created successfully" });
  }
);

export default router;