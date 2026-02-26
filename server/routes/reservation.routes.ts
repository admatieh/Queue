import { Router } from "express";
import * as reservationController from "../controllers/reservation.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { api } from "@shared/routes";

const router = Router();

// To be mounted at root '/' because api.reservations.*.path provides full path string.
router.post(api.reservations.create.path, requireAuth, reservationController.createReservation);
//router.get(api.reservations.listActive.path, requireAuth, reservationController.listActiveReservations);
router.post(api.reservations.cancel.path, requireAuth, reservationController.cancelReservation);

export default router;