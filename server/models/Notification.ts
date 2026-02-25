import mongoose, { Schema, Document } from "mongoose";

export interface IUserNotification extends Document {
    userId: mongoose.Types.ObjectId;
    venueId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

const UserNotificationSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// User index and Venue index
UserNotificationSchema.index({ userId: 1, createdAt: -1 });
UserNotificationSchema.index({ venueId: 1 });

export const UserNotificationModel = mongoose.model<IUserNotification>("UserNotification", UserNotificationSchema);

export interface IUserVenueNotificationSubscription extends Document {
    userId: mongoose.Types.ObjectId;
    venueId: mongoose.Types.ObjectId;
    enabled: boolean;
    createdAt: Date;
}

const UserVenueNotificationSubscriptionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

UserVenueNotificationSubscriptionSchema.index({ userId: 1, venueId: 1 }, { unique: true });

export const UserVenueNotificationSubscriptionModel = mongoose.model<IUserVenueNotificationSubscription>(
    "UserVenueNotificationSubscription",
    UserVenueNotificationSubscriptionSchema
);
