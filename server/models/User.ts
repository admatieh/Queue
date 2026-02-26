import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    name?: string;
    role: "user" | "admin" | "super_admin";
    status: "active" | "disabled";
    // venueId is required for admin users; super_admins and regular users leave it unset
    venueId?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    deletedAt?: Date | null;
    deletedBy?: string | null;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    role: { type: String, enum: ["user", "admin", "super_admin"], default: "user" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    // venueId: primary venue the admin manages (required for role=admin, optional otherwise)
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", default: null },
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
});

UserSchema.pre(/^find/, function (this: mongoose.Query<any, Document>, next) {
    if (this.getQuery().deletedAt === undefined) {
        this.where({ deletedAt: null });
    }
    next();
});

export const UserModel = mongoose.model<IUser>("User", UserSchema);
