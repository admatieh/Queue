import { UserModel, IUser } from "../models/User";
import { VenueModel, IVenue } from "../models/Venue";
import { SeatModel, ISeat } from "../models/Seat";
import { ReservationModel, IReservation } from "../models/Reservation";
import {
  type User, type InsertUser,
  type Venue, type InsertVenue,
  type Seat, type InsertSeat,
  type Reservation, type InsertReservation,
} from "@shared/schema";
import mongoose from "mongoose";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Venues
  getVenues(): Promise<Venue[]>;
  getVenue(id: string): Promise<Venue | undefined>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: string, venue: Partial<InsertVenue>): Promise<Venue>;

  // Seats
  getSeats(venueId: string): Promise<Seat[]>;
  getSeat(id: string): Promise<Seat | undefined>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  updateSeat(id: string, seat: Partial<InsertSeat>): Promise<Seat>;

  // Reservations
  createReservation(reservation: InsertReservation & { userId: string, endTime: Date }): Promise<Reservation>;
  getActiveReservationsByUser(userId: string): Promise<(Reservation & { venueName: string; seatLabel: string })[]>;
  getActiveReservationForSeat(seatId: string): Promise<Reservation | undefined>;
  cancelReservation(id: string): Promise<Reservation | undefined>;
  getReservationsByVenue(venueId: string): Promise<(Reservation & { userName: string; userEmail: string })[]>;
  expireReservations(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private mapUser(doc: IUser): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      deletedAt: doc.deletedAt?.toISOString() || null,
      deletedBy: doc.deletedBy ? doc.deletedBy.toString() : null
    };
  }

  private mapVenue(doc: IVenue): Venue {
    return {
      id: doc._id.toString(),
      name: doc.name,
      location: doc.location,
      description: doc.description,
      capacity: doc.capacity,
      openTime: doc.openTime,
      closeTime: doc.closeTime,
      timezone: doc.timezone,
      imageUrl: doc.imageUrl,
      category: doc.category as any,
      status: doc.status,
      occupiedSeats: (doc as any).occupiedSeats,
      createdAt: doc.createdAt.toISOString(),
      deletedAt: doc.deletedAt?.toISOString() || null,
      deletedBy: doc.deletedBy ? doc.deletedBy.toString() : null
    };
  }

  private mapSeat(doc: ISeat): Seat {
    return {
      id: doc._id.toString(),
      venueId: doc.venueId.toString(),
      label: doc.label,
      section: doc.section,
      locationDescription: doc.locationDescription,
      type: doc.type,
      status: doc.status,
      x: doc.x,
      y: doc.y
    };
  }

  private mapReservation(doc: IReservation): Reservation {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      venueId: doc.venueId.toString(),
      seatId: doc.seatId.toString(),
      startTime: doc.startTime.toISOString(),
      endTime: doc.endTime.toISOString(),
      durationMinutes: doc.durationMinutes,
      status: doc.status,
      createdAt: doc.createdAt.toISOString()
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    const user = await UserModel.findById(id);
    return user ? this.mapUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email });
    return user ? { ...this.mapUser(user), password: user.passwordHash } : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = new UserModel({
      email: insertUser.email,
      passwordHash: insertUser.password, // Mapped to passwordHash in Mongo
      name: insertUser.name,
      role: insertUser.role
    });
    await user.save();
    return this.mapUser(user);
  }

  async getVenues(): Promise<Venue[]> {
    const now = new Date();
    const venuesWithOccupancy = await VenueModel.aggregate([
      {
        $lookup: {
          from: "reservations",
          let: { venueId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$venueId", "$$venueId"] },
                    { $eq: ["$status", "active"] },
                    { $gt: ["$endTime", now] }
                  ]
                }
              }
            }
          ],
          as: "activeReservations"
        }
      },
      {
        $addFields: {
          occupiedSeats: { $size: "$activeReservations" }
        }
      },
      {
        $project: {
          activeReservations: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return venuesWithOccupancy.map(v => ({
      id: v._id.toString(),
      name: v.name,
      location: v.location,
      description: v.description,
      capacity: v.capacity,
      openTime: v.openTime,
      closeTime: v.closeTime,
      timezone: v.timezone,
      imageUrl: v.imageUrl,
      category: v.category,
      status: v.status,
      occupiedSeats: v.occupiedSeats,
      createdAt: v.createdAt.toISOString(),
      deletedAt: v.deletedAt ? v.deletedAt.toISOString() : null,
      deletedBy: v.deletedBy ? v.deletedBy.toString() : null
    }));
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    const venue = await VenueModel.findById(id);
    return venue ? this.mapVenue(venue) : undefined;
  }

  async createVenue(venue: InsertVenue): Promise<Venue> {
    const newVenue = new VenueModel(venue);
    await newVenue.save();
    return this.mapVenue(newVenue);
  }

  async updateVenue(id: string, updates: Partial<InsertVenue>): Promise<Venue> {
    const updated = await VenueModel.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) throw new Error("Venue not found");
    return this.mapVenue(updated);
  }

  async getSeats(venueId: string): Promise<Seat[]> {
    const seats = await SeatModel.find({ venueId });
    return seats.map(s => this.mapSeat(s));
  }

  async getSeat(id: string): Promise<Seat | undefined> {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    const seat = await SeatModel.findById(id);
    return seat ? this.mapSeat(seat) : undefined;
  }

  async createSeat(seat: InsertSeat): Promise<Seat> {
    const newSeat = new SeatModel(seat);
    await newSeat.save();
    return this.mapSeat(newSeat);
  }

  async updateSeat(id: string, updates: Partial<InsertSeat>): Promise<Seat> {
    const updated = await SeatModel.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) throw new Error("Seat not found");
    return this.mapSeat(updated);
  }

  async createReservation(res: InsertReservation & { userId: string, endTime: Date }): Promise<Reservation> {
    // Atomic claim logic will be handled here or in routes
    // For storage, we just create the document
    const reservation = new ReservationModel({
      userId: res.userId,
      venueId: res.venueId,
      seatId: res.seatId,
      durationMinutes: res.durationMinutes,
      endTime: res.endTime,
      status: "active"
    });
    await reservation.save();

    // Update seat to link back
    await SeatModel.findByIdAndUpdate(res.seatId, {
      status: "occupied", // or "reserved"
      activeReservationId: reservation._id,
      reservedUntil: res.endTime
    });

    return this.mapReservation(reservation);
  }

  async getActiveReservationsByUser(userId: string): Promise<(Reservation & { venueName: string; seatLabel: string })[]> {
    const now = new Date();
    const reservations = await ReservationModel.find({
      userId,
      status: "active",
      endTime: { $gt: now }
    }).populate("venueId").populate("seatId");

    return reservations.map((r: any) => ({
      ...this.mapReservation(r),
      venueName: r.venueId.name,
      seatLabel: r.seatId.label
    }));
  }

  async getActiveReservationForSeat(seatId: string): Promise<Reservation | undefined> {
    const now = new Date();
    const res = await ReservationModel.findOne({
      seatId,
      status: "active",
      endTime: { $gt: now }
    });
    return res ? this.mapReservation(res) : undefined;
  }

  async cancelReservation(id: string): Promise<Reservation | undefined> {
    const reservation = await ReservationModel.findById(id);
    if (!reservation) return undefined;

    reservation.status = "cancelled";
    await reservation.save();

    // Free the seat
    await SeatModel.findByIdAndUpdate(reservation.seatId, {
      status: "available",
      $unset: { activeReservationId: "", reservedUntil: "" }
    });

    return this.mapReservation(reservation);
  }

  async getReservationsByVenue(venueId: string): Promise<(Reservation & { userName: string; userEmail: string })[]> {
    const reservations = await ReservationModel.find({ venueId })
      .sort({ createdAt: -1 })
      .populate("userId");

    return reservations.map((r: any) => ({
      ...this.mapReservation(r),
      userName: r.userId.name || "Unknown",
      userEmail: r.userId.email
    }));
  }

  async expireReservations(): Promise<void> {
    const now = new Date();
    const expired = await ReservationModel.find({
      status: "active",
      endTime: { $lt: now }
    });

    for (const res of expired) {
      res.status = "expired";
      await res.save();

      // Free the seat only if this was the active reservation
      await SeatModel.findOneAndUpdate(
        { _id: res.seatId, activeReservationId: res._id },
        {
          status: "available",
          $unset: { activeReservationId: "", reservedUntil: "" }
        }
      );
    }
  }
}

export const storage = new DatabaseStorage();
