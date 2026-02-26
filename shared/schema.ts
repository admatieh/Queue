import { z } from "zod";

// === USERS ===
export const insertUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    role: z.enum(["user", "admin"]).default("user"),
});

export type User = {
    id: string; // MongoDB _id
    email: string;
    password?: string;
    name?: string;
    role: "user" | "admin";
    createdAt: string;
};

export type InsertUser = z.infer<typeof insertUserSchema>;

// === VENUES ===
export const insertVenueSchema = z.object({
    name: z.string().min(1),
    location: z.string().min(1),
    description: z.string().optional(),
    capacity: z.number().default(0),
    openTime: z.string().default("09:00"),
    closeTime: z.string().default("22:00"),
    imageUrl: z.string().optional(),
    category: z.enum(["tech", "cafe", "restaurant"]).default("tech"),
});

export type Venue = {
    id: string;
    name: string;
    location: string;
    description?: string;
    capacity: number;
    openTime: string;
    closeTime: string;
    imageUrl?: string;
    category: "tech" | "cafe" | "restaurant";
    occupiedSeats?: number;
    createdAt: string;
};

export type InsertVenue = z.infer<typeof insertVenueSchema>;

// === SEATS ===
export const insertSeatSchema = z.object({
    venueId: z.string(),
    row: z.string(),
    col: z.string(),
    type: z.enum(["standard", "premium", "accessible"]).default("standard"),
    status: z.enum(["available", "occupied", "disabled"]).default("available"),
    x: z.number().optional(),
    y: z.number().optional(),
});

export type Seat = {
    id: string;
    venueId: string;
    row: string;
    col: string;
    type: "standard" | "premium" | "accessible";
    status: "available" | "occupied" | "disabled";
    x?: number;
    y?: number;
};

export type InsertSeat = z.infer<typeof insertSeatSchema>;

// === RESERVATIONS ===

export const insertReservationSchema = z.object({
  venueId: z.string(),
  seatId: z.string(),
  startTime: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid start time",
  }).transform(val => new Date(val)), // <-- transform to Date
  endTime: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid end time",
  }).transform(val => new Date(val)), // <-- transform to Date
  // Optional: still include durationMinutes if your frontend sends it
  durationMinutes: z.number().min(1).optional(),
});

export type Reservation = {
  id: string;
  userId: string;
  venueId: string;
  seatId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: "active" | "expired" | "cancelled";
  createdAt: string;
};

export type InsertReservation = z.infer<typeof insertReservationSchema>;

// Custom Types for API Responses
export type SeatWithReservation = Seat & {
    isReserved: boolean;
    reservedUntil: string | null; // ISO string
};
