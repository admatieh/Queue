import { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { api } from "@shared/routes";
import { z } from "zod";

export const createReservation = async (req: Request, res: Response) => {
    try {
        const input = api.reservations.create.input.parse(req.body);
        const user = req.user as any;

        // 1. Check if seat exists
        const seat = await storage.getSeat(input.seatId);
        if (!seat || seat.venueId !== input.venueId) {
            return res.status(404).json({ message: "Seat not found" });
        }

        // 2. Check if seat is available
        const existingRes = await storage.getActiveReservationForSeat(input.seatId);
        if (existingRes || seat.status !== "available") {
            return res.status(409).json({ message: "Seat is already reserved or unavailable" });
        }

        // 3. Create reservation
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + input.durationMinutes * 60000);

        const reservation = await storage.createReservation({
            userId: user.id,
            venueId: input.venueId,
            seatId: input.seatId,
            durationMinutes: input.durationMinutes,
            endTime,
        });

        res.status(201).json(reservation);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        throw err;
    }
};

export const listActiveReservations = async (req: Request, res: Response) => {
    const user = req.user as any;
    const reservations = await storage.getActiveReservationsByUser(user.id);
    res.json(reservations);
};

export const cancelReservation = async (req: Request, res: Response) => {
    const user = req.user as any;
    const resId = req.params.id;

    // Verify ownership
    const active = await storage.getActiveReservationsByUser(user.id);
    const target = active.find(r => r.id === resId);

    if (!target) {
        return res.status(404).json({ message: "Reservation not found or access denied" });
    }

    const cancelled = await storage.cancelReservation(resId);
    res.json(cancelled);
};
