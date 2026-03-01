import { z } from "zod";

// === USERS ===
export const insertUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    role: z.enum(["user", "admin", "super_admin"]).default("user"),
    status: z.enum(["active", "disabled"]).default("active"),
});

// Admin-specific schemas (used by super-admin endpoints)
export const insertAdminSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
    role: z.enum(["admin", "super_admin"]).default("admin"),
    // venueId required for role=admin, optional for super_admin
    venueId: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.role === "admin" && !data.venueId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["venueId"],
            message: "Venue is required for admin users",
        });
    }
});

export const updateAdminSchema = z.object({
    name: z.string().optional(),
    status: z.enum(["active", "disabled"]).optional(),
    venueId: z.string().nullable().optional(),
});

export type User = {
    id: string; // MongoDB _id
    email: string;
    password?: string;
    name?: string;
    role: "user" | "admin" | "super_admin";
    status: "active" | "disabled";
    venueId?: string | null; // primary venue for admin users
    createdAt: string;
    deletedAt?: string | null;
    deletedBy?: string | null;
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
    timezone: z.string().default("UTC"),
    imageUrl: z.string().optional(),
    category: z.enum(["tech", "cafe", "restaurant"]).default("tech"),
    status: z.enum(["active", "disabled"]).default("active"),
});

export type Venue = {
    id: string;
    name: string;
    location: string;
    description?: string;
    capacity: number;
    openTime: string;
    closeTime: string;
    timezone: string;
    imageUrl?: string;
    category: "tech" | "cafe" | "restaurant";
    status: "active" | "disabled";
    occupiedSeats?: number;
    createdAt: string;
    deletedAt?: string | null;
    deletedBy?: string | null;
};

export type InsertVenue = z.infer<typeof insertVenueSchema>;

// === SEATS ===
export const insertSeatSchema = z.object({
    venueId: z.string(),
    label: z.string(),
    section: z.string().optional(),
    locationDescription: z.string().optional(),
    type: z.enum(["standard", "premium", "accessible"]).default("standard"),
    status: z.enum(["available", "occupied", "disabled"]).default("available"),
    x: z.number().optional(),
    y: z.number().optional(),
});

// Type
export type Seat = {
  id: string;
  venueId: string;
  label: string;
  section?: string;
  locationDescription?: string;
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

// === ADMIN & NOTIFICATIONS ===

export type AdminVenueAssignment = {
    id: string;
    adminId: string;
    venueId: string;
    assignedBy: string;
    createdAt: string;
};

export type UserVenueNotificationSubscription = {
    id: string;
    userId: string;
    venueId: string;
    enabled: boolean;
    createdAt: string;
};

export type UserNotification = {
    id: string;
    userId: string;
    venueId: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
};

export type AuditLog = {
    id: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: any;
    createdAt: string;
};

// Custom Types for API Responses
export type SeatWithReservation = Seat & {
    isReserved: boolean;
    reservedUntil: string | null; // ISO string
};
