import { Router } from "express";
import * as venueController from "../controllers/venue.controller";
import { api } from "@shared/routes";

const router = Router();

// /api/venues (mounted at /api or /api/venues via index, keep path clean relative to mount)
// Using exact paths from shared routes api mapping to remain perfectly compatible.
// We must assume the router is mounted at the root / if using full paths, or we strip prefixes.
// Given api.venues.list.path is typically full paths e.g., '/api/venues',
// We will mount this router at the root '/' or simply use the paths.

router.get(api.venues.list.path, venueController.listVenues);
router.get(api.venues.get.path, venueController.getVenue);
router.get(api.venues.getSeats.path, venueController.getSeats);

export default router;
