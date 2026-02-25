import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
    actorUserId: mongoose.Types.ObjectId;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: any;
    createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed }, // Store any JSON changes here
    createdAt: { type: Date, default: Date.now }
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ actorUserId: 1 });

export const AuditLogModel = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
