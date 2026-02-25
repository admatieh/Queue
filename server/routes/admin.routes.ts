import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import * as superAdminController from "../controllers/super_admin.controller";
import { requireAdmin, requireSuperAdmin, requireVenueAccess } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import multer from "multer";

const router = Router();

// Wrap multer to handle its errors properly globally or per route
const handleUpload = (req: any, res: any, next: any) => {
    upload.single("image")(req, res, (err: any) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
                }
                return res.status(400).json({ message: err.message });
            }
            return res.status(400).json({ message: err.message || "Invalid file" });
        }
        next();
    });
};

// === SUPER ADMIN ROUTES ===
router.get("/users", requireSuperAdmin, superAdminController.listAdmins);
router.post("/users", requireSuperAdmin, superAdminController.createAdmin);
router.put("/users/:id", requireSuperAdmin, superAdminController.updateAdmin);
router.delete("/users/:id", requireSuperAdmin, superAdminController.deleteAdmin);
router.put("/users/:id/venues", requireSuperAdmin, superAdminController.assignVenuesToAdmin);
router.get("/users/:id/venues", requireSuperAdmin, superAdminController.getAdminVenues);

router.post("/venues", requireSuperAdmin, adminController.createVenue);
router.delete("/venues/:id", requireSuperAdmin, adminController.deleteVenue); // We'll add this to controller next
router.get("/audit-logs", requireSuperAdmin, superAdminController.listAuditLogs);

// === VENUE ADMIN ROUTES ===
// (Super Admins can also access these because of requireVenueAccess logic)
router.get("/venues/me", requireAdmin, adminController.listMyVenues); // We'll add this
router.put("/venues/:id", requireVenueAccess, adminController.updateVenue);
router.post("/venues/:id/upload", requireVenueAccess, handleUpload, adminController.uploadVenueImage);

router.post("/venues/:id/seats", requireVenueAccess, adminController.createSeat);
router.put("/seats/:id", requireVenueAccess, adminController.updateSeat); // Seat ID in params, but requires venue ID logic check

router.get("/venues/:id/reservations", requireVenueAccess, adminController.listReservations);
router.post("/reservations/:id/cancel", requireAdmin, adminController.cancelReservation); // Needs reservation -> venue lookup check

router.post("/venues/:id/notifications", requireVenueAccess, superAdminController.dispatchNotification);

export default router;
