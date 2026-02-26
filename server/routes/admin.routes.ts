import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { requireAdmin } from "server/middleware/jwt.middleware";
import { upload } from "../middleware/upload.middleware";
import { api } from "@shared/routes";
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

router.post(api.admin.createVenue.path, requireAdmin, adminController.createVenue);
router.put(api.admin.updateVenue.path, requireAdmin, adminController.updateVenue);
router.post(api.admin.createSeat.path, requireAdmin, adminController.createSeat);
router.put(api.admin.updateSeat.path, requireAdmin, adminController.updateSeat);
router.get(api.admin.listReservations.path, requireAdmin, adminController.listReservations);
router.post(api.admin.cancelReservation.path, requireAdmin, adminController.cancelReservation);
router.post(api.admin.uploadVenueImage.path, requireAdmin, handleUpload, adminController.uploadVenueImage);

export default router;
