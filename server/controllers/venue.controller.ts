import { Request, Response } from "express";
import { storage } from "../services/storage.service";

export const listVenues = async (req: Request, res: Response) => {
    const venues = await storage.getVenues();
    res.json(venues);
};

export const getVenue = async (req: Request, res: Response) => {
    const venue = await storage.getVenue(req.params.id);
    if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
    }
    res.json(venue);
};

export const getSeats = async (req: Request, res: Response) => {
    const venueId = req.params.id;
    const seats = await storage.getSeats(venueId);

    // Check reservation status for each seat
    const now = new Date();
    const activeReservations = await storage.getReservationsByVenue(venueId);

    const seatsWithStatus = seats.map(seat => {
        const activeRes = activeReservations.find(r =>
            r.seatId === seat.id &&
            r.status === "active" &&
            new Date(r.endTime) > now
        );

        return {
            ...seat,
            isReserved: !!activeRes,
            reservedUntil: activeRes ? activeRes.endTime : null,
            status: activeRes ? "occupied" : seat.status,
        };
    });

    res.json({
        seats: seatsWithStatus,
        serverTime: new Date().toISOString(),
    });
};
