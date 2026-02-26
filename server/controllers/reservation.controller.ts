import { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { api } from "@shared/routes";
import { z } from "zod";
import { createNotification } from "../utils/Notification.utils";
import { sendRealtimeNotification } from "../utils/realtimeNotification.util";

export const createReservation = async (req: Request, res: Response) => {
  try {
    const input = api.reservations.create.input.parse(req.body);
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const start = new Date(input.startTime);
    const end = new Date(input.endTime);

    if (start >= end) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    // 1️⃣ Check if seat exists
    const seat = await storage.getSeat(input.seatId);
    if (!seat || seat.venueId !== input.venueId) {
      return res.status(404).json({ message: "Seat not found" });
    }

    // 2️⃣ Get venue
    const venue = await storage.getVenue(input.venueId);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // 3️⃣ Validate inside venue hours
    const [openHour, openMinute] = venue.openTime.split(":").map(Number);
    const [closeHour, closeMinute] = venue.closeTime.split(":").map(Number);

    const openDate = new Date(start);
    openDate.setHours(openHour, openMinute, 0, 0);

    const closeDate = new Date(start);
    closeDate.setHours(closeHour, closeMinute, 0, 0);

    if (start < openDate || end > closeDate) {
      return res.status(400).json({
        message: "Reservation must be within venue operating hours",
      });
    }

    // 4️⃣ Check overlapping reservations
    const overlapping = await storage.getOverlappingReservation(input.seatId, start, end);
    if (overlapping) {
      return res.status(409).json({
        message: "Seat is already reserved for this time range",
      });
    }

    // 5️⃣ Calculate duration
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;

    // 6️⃣ Create reservation
    const reservation = await storage.createReservation({
      userId: user.id,
      venueId: input.venueId,
      seatId: input.seatId,
      startTime: start,
      endTime: end,
      durationMinutes,
    });

    // 7️⃣ Create notification
    const notification = await createNotification(
      user.id,
      "reservation-created",
      `Your seat at venue ${venue.name} is confirmed for ${start.toLocaleTimeString()}.`
    );

    // 8️⃣ Send real-time popup
    sendRealtimeNotification(user.id.toString(), notification);

    res.status(201).json(reservation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    throw err;
  }
};
//cancel reservation 
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
    // ✅ Create notification
  const notification = await createNotification(
    user.id,
    "reservation-cancelled",
    `Your seat at venue ${target.venueId} has been cancelled.`
  );

  // ✅ Send real-time popup
  sendRealtimeNotification(user.id.toString(), notification);

  res.json(cancelled);
};