import { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { api } from "@shared/routes";
import { z } from "zod";
import { SeatModel } from "../models/Seat";
import { ReservationModel } from "../models/Reservation";

export const createReservation = async (req: Request, res: Response) => {
    try {
        const input = api.reservations.create.input.parse(req.body);
        const user = req.user as any;

        // 1. Atomically claim the seat — this is a single DB operation that prevents
        //    race conditions. If the seat is already occupied, findOneAndUpdate returns
        //    null and we respond 409 without creating a reservation record.
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + input.durationMinutes * 60000);

        const claimedSeat = await SeatModel.findOneAndUpdate(
            {
                _id: input.seatId,
                venueId: input.venueId,
                status: "available",
            },
            {
                status: "occupied",
                reservedUntil: endTime,
            },
            { new: true }
        );

        if (!claimedSeat) {
            return res.status(409).json({ message: "Seat is already reserved or unavailable" });
        }

        // 2. Create the reservation record (seat already atomically claimed above)
        const reservationDoc = new ReservationModel({
            userId: user.id,
            venueId: input.venueId,
            seatId: input.seatId,
            durationMinutes: input.durationMinutes,
            endTime,
            status: "active",
        });
        await reservationDoc.save();

        // 3. Link reservation id back to seat
        await SeatModel.findByIdAndUpdate(input.seatId, {
            activeReservationId: reservationDoc._id,
        });

        res.status(201).json({
            id: reservationDoc._id.toString(),
            userId: user.id,
            venueId: input.venueId,
            seatId: input.seatId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            durationMinutes: input.durationMinutes,
            status: "active",
            createdAt: reservationDoc.createdAt.toISOString(),
        });
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

    // Verify ownership — user can only cancel their own active reservations
    const active = await storage.getActiveReservationsByUser(user.id);
    const target = active.find(r => r.id === resId);

    if (!target) {
        return res.status(404).json({ message: "Reservation not found or access denied" });
    }

    const cancelled = await storage.cancelReservation(resId);
    res.json(cancelled);
};
