import { Request, Response, NextFunction } from "express";
import { storage } from "../services/storage.service";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import fs from "fs";

export const createVenue = async (req: Request, res: Response) => {
    try {
        const input = api.admin.createVenue.input.parse(req.body);
        const venue = await storage.createVenue(input);
        res.status(201).json(venue);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        throw err;
    }
};

export const updateVenue = async (req: Request, res: Response) => {
    const venueId = req.params.id;
    const input = api.admin.updateVenue.input.parse(req.body);
    const updated = await storage.updateVenue(venueId, input);
    res.json(updated);
};

export const createSeat = async (req: Request, res: Response) => {
    const venueId = req.params.id;
    const input = api.admin.createSeat.input.parse(req.body);
    const seat = await storage.createSeat({ ...input, venueId });
    res.status(201).json(seat);
};

export const updateSeat = async (req: Request, res: Response) => {
    const seatId = req.params.id;
    const input = api.admin.updateSeat.input.parse(req.body);
    const updated = await storage.updateSeat(seatId, input);
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
