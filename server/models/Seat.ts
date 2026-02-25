import mongoose, { Schema, Document } from "mongoose";

export interface ISeat extends Document {
    venueId: mongoose.Types.ObjectId;
    label: string;
    section?: string;
    locationDescription?: string;
    type: "standard" | "premium" | "accessible";
    status: "available" | "occupied" | "disabled";
    activeReservationId?: mongoose.Types.ObjectId;
    reservedUntil?: Date;
    x?: number;
    y?: number;
    updatedAt: Date;
}

const SeatSchema: Schema = new Schema({
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    label: { type: String, required: true },
    section: { type: String },
    locationDescription: { type: String },
    type: { type: String, enum: ["standard", "premium", "accessible"], default: "standard" },
    status: { type: String, enum: ["available", "occupied", "disabled"], default: "available" },
    activeReservationId: { type: Schema.Types.ObjectId, ref: "Reservation" },
    reservedUntil: { type: Date },
    x: { type: Number },
    y: { type: Number },
}, { timestamps: true });

// Unique compound index for venueId and label
SeatSchema.index({ venueId: 1, label: 1 }, { unique: true });
SeatSchema.index({ venueId: 1, status: 1 });

export const SeatModel = mongoose.model<ISeat>("Seat", SeatSchema);
