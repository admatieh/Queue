import { Request, Response, NextFunction } from "express";
import { storage } from "../services/storage.service";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import { logAudit } from "./super_admin.controller";
import { AdminVenueAssignmentModel } from "../models/AdminVenueAssignment";
import { VenueModel } from "../models/Venue";

export const listMyVenues = async (req: Request, res: Response) => {
    const actor = req.user as any;
    if (actor.role === "super_admin") {
        const venues = await storage.getVenues();
        return res.json(venues);
    }
    const assignments = await AdminVenueAssignmentModel.find({ adminId: actor.id });
    const venueIds = assignments.map(a => a.venueId);

    // Instead of using storage, we use mongoose to fetch multiple
    const venues = await VenueModel.find({ _id: { $in: venueIds } }).sort({ createdAt: -1 });

    // Convert to API format loosely matching storage mapVenue
    const mapped = venues.map(v => ({
        id: v.id, name: v.name, location: v.location, description: v.description,
        capacity: v.capacity, openTime: v.openTime, closeTime: v.closeTime,
        timezone: v.timezone, imageUrl: v.imageUrl, category: v.category,
        status: v.status, createdAt: v.createdAt.toISOString()
    }));

    res.json(mapped);
};

export const createVenue = async (req: Request, res: Response) => {
    try {
        console.log("[DEBUG] createVenue called with body:", req.body);
        const input = api.admin.createVenue.input.parse(req.body);
        const actor = req.user as any;
        console.log("[DEBUG] createVenue parsed input:", input, "actor:", actor.email);
        const venue = await storage.createVenue(input);
        await logAudit(actor.id, "CREATE_VENUE", "venue", venue.id, { name: venue.name });
        res.status(201).json(venue);
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error("[DEBUG] createVenue ZodError:", err.errors);
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error("[DEBUG] createVenue unknown error:", err);
        throw err;
    }
};

export const updateVenue = async (req: Request, res: Response) => {
    const venueId = req.params.id;
    const input = api.admin.updateVenue.input.parse(req.body);
    const actor = req.user as any;
    const updated = await storage.updateVenue(venueId, input);
    await logAudit(actor.id, "UPDATE_VENUE", "venue", venueId, input);
    res.json(updated);
};

export const deleteVenue = async (req: Request, res: Response) => {
    const venueId = req.params.id;
    const actor = req.user as any;

    const venue = await VenueModel.findByIdAndUpdate(venueId, {
        deletedAt: new Date(),
        deletedBy: actor.id,
        status: "disabled"
    });

    if (!venue) return res.status(404).json({ message: "Venue not found" });
    await logAudit(actor.id, "DELETE_VENUE", "venue", venueId, { name: venue.name });
    res.json({ message: "Venue soft deleted" });
};

export const createSeat = async (req: Request, res: Response) => {
    const venueId = req.params.id;
    const input = api.admin.createSeat.input.parse(req.body);
    const actor = req.user as any;
    const seat = await storage.createSeat({ ...input, venueId });
    await logAudit(actor.id, "CREATE_SEAT", "seat", seat.id, { venueId, label: seat.label });
    res.status(201).json(seat);
};

export const updateSeat = async (req: Request, res: Response) => {
    const seatId = req.params.id;
    const input = api.admin.updateSeat.input.parse(req.body);
    const actor = req.user as any;
    const updated = await storage.updateSeat(seatId, input);
    await logAudit(actor.id, "UPDATE_SEAT", "seat", seatId, input);
    res.json(updated);
};

export const listReservations = async (req: Request, res: Response) => {
    const venueId = req.params.id;
    const reservations = await storage.getReservationsByVenue(venueId);
    res.json(reservations);
};

export const cancelReservation = async (req: Request, res: Response) => {
    const resId = req.params.id;
    const cancelled = await storage.cancelReservation(resId);
    if (!cancelled) return res.status(404).json({ message: "Reservation not found" });
    res.json(cancelled);
};

export const uploadVenueImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        const venueId = req.params.id;
        const venue = await storage.getVenue(venueId);
        if (!venue) {
            // Clean up uploaded file if venue doesn't exist
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: "Venue not found" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        await storage.updateVenue(venueId, { imageUrl });

        res.json({ imageUrl });
    } catch (error) {
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        next(error);
    }
};
