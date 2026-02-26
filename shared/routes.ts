import { z } from "zod";
import {
  type User, type Venue, type Seat, type Reservation,
  insertUserSchema, insertVenueSchema, insertSeatSchema, insertReservationSchema
} from "./schema";

// Shared error schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: "POST" as const,
      path: "/api/auth/register" as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<User>(),
        400: errorSchemas.validation,
        409: errorSchemas.conflict,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      input: z.object({
        email: z.string().email(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<User>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me" as const,
      responses: {
        200: z.custom<User>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  venues: {
    list: {
      method: "GET" as const,
      path: "/api/venues" as const,
      responses: {
        200: z.array(z.custom<Venue>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/venues/:id" as const,
      responses: {
        200: z.custom<Venue>(),
        404: errorSchemas.notFound,
      },
    },
    getSeats: {
      method: "GET" as const,
      path: "/api/venues/:id/seats" as const,
      responses: {
        200: z.object({
          seats: z.array(z.custom<Seat & { isReserved: boolean; reservedUntil: string | null }>()),
          serverTime: z.string(), // ISO string
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  reservations: {
    create: {
      method: "POST" as const,
      path: "/api/reservations" as const,
      input: z.object({
        venueId: z.string(),
        seatId: z.string(),
        startTime: z.string(), // ISO string from frontend
  endTime: z.string(),   // ISO string from frontend

      }),
      responses: {
        201: z.custom<Reservation>(),
        400: errorSchemas.validation,
        409: errorSchemas.conflict, // Double booking
        401: errorSchemas.unauthorized,
      },
    },
    listActive: {
      method: "GET" as const,
      path: "/api/reservations/me/active" as const,
      responses: {
        200: z.array(z.custom<Reservation & { venueName: string; seatRow: string; seatCol: string }>()),
        401: errorSchemas.unauthorized,
      },
    },
    cancel: {
      method: "POST" as const,
      path: "/api/reservations/:id/cancel" as const,
      responses: {
        200: z.custom<Reservation>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  admin: {
    createVenue: {
      method: "POST" as const,
      path: "/api/admin/venues" as const,
      input: insertVenueSchema,
      responses: {
        201: z.custom<Venue>(),
        401: errorSchemas.unauthorized,
      },
    },
    updateVenue: {
      method: "PUT" as const,
      path: "/api/admin/venues/:id" as const,
      input: insertVenueSchema.partial(),
      responses: {
        200: z.custom<Venue>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    createSeat: {
      method: "POST" as const,
      path: "/api/admin/venues/:id/seats" as const,
      input: insertSeatSchema.omit({ venueId: true }),
      responses: {
        201: z.custom<Seat>(),
        401: errorSchemas.unauthorized,
      },
    },
    updateSeat: {
      method: "PUT" as const,
      path: "/api/admin/seats/:id" as const,
      input: insertSeatSchema.partial(),
      responses: {
        200: z.custom<Seat>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    listReservations: {
      method: "GET" as const,
      path: "/api/admin/venues/:id/reservations" as const,
      // Query param status=active handled in implementation
      responses: {
        200: z.array(z.custom<Reservation & { userName: string; userEmail: string }>()),
        401: errorSchemas.unauthorized,
      },
    },
    cancelReservation: {
      method: "POST" as const,
      path: "/api/admin/reservations/:id/cancel" as const,
      responses: {
        200: z.custom<Reservation>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    uploadVenueImage: {
      method: "POST" as const,
      path: "/api/admin/venues/:id/upload" as const,
      responses: {
        200: z.object({ imageUrl: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
