import mongoose, { Schema, Document } from "mongoose";

export interface IVenue extends Document {
    name: string;
    location: string;      // human-readable address / location string
    address?: string;      // more precise street address for Maps embed
    lat?: number;          // optional GPS coordinate
    lng?: number;          // optional GPS coordinate
    description?: string;
    capacity: number;
    openTime: string;
    closeTime: string;
    timezone: string;
    imageUrl?: string;     // legacy single image (kept for backward compat)
    images?: string[];     // gallery: ordered array of image URLs
    category: string;
    status: "active" | "disabled";
    createdAt: Date;
    deletedAt?: Date | null;
    deletedBy?: string | null;
}

const VenueSchema: Schema = new Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    description: { type: String },
    capacity: { type: Number, default: 0 },
    openTime: { type: String, default: "09:00" },
    closeTime: { type: String, default: "22:00" },
    timezone: { type: String, default: "UTC" },
    imageUrl: { type: String },
    images: { type: [String], default: [] },
    category: { type: String, enum: ["tech", "cafe", "restaurant"], default: "tech", lowercase: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
});

VenueSchema.index({ status: 1 });

VenueSchema.pre(/^find/, function (this: mongoose.Query<any, Document>, next) {
    if (this.getQuery().deletedAt === undefined) {
        this.where({ deletedAt: null });
    }
    next();
});

export const VenueModel = mongoose.model<IVenue>("Venue", VenueSchema);
