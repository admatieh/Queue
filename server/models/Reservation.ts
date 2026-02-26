import mongoose, { Schema, Document } from "mongoose";

export interface IReservation extends Document {
    userId: mongoose.Types.ObjectId;
    venueId: mongoose.Types.ObjectId;
    seatId: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    status: "active" | "expired" | "cancelled";
    createdAt: Date;
}

const ReservationSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    seatId: { type: Schema.Types.ObjectId, ref: "Seat", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
    createdAt: { type: Date, default: Date.now }
});

ReservationSchema.index({ userId: 1, status: 1 });
ReservationSchema.index({ venueId: 1, status: 1, endTime: 1 });

export const ReservationModel = mongoose.model<IReservation>("Reservation", ReservationSchema);
