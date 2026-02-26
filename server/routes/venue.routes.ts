import { Router } from "express";
import * as venueController from "../controllers/venue.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { api } from "@shared/routes";

const router = Router();

// Public routes (no auth needed)
router.get(api.venues.list.path, venueController.listVenues);
router.get(api.venues.get.path, venueController.getVenue);

// Protected route 
router.get(api.venues.getSeats.path, requireAuth, venueController.getSeats);

export default router;