import mongoose, { Schema, Document } from "mongoose";

export interface IAdminVenueAssignment extends Document {
    adminId: mongoose.Types.ObjectId;
    venueId: mongoose.Types.ObjectId;
    assignedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const AdminVenueAssignmentSchema: Schema = new Schema({
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
});

AdminVenueAssignmentSchema.index({ adminId: 1, venueId: 1 }, { unique: true });

export const AdminVenueAssignmentModel = mongoose.model<IAdminVenueAssignment>("AdminVenueAssignment", AdminVenueAssignmentSchema);
