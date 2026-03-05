import { Request, Response } from "express";
import { UserModel } from "../models/User";
import { VenueModel } from "../models/Venue";
import { AdminVenueAssignmentModel } from "../models/AdminVenueAssignment";
import { AuditLogModel } from "../models/AuditLog";
import { storage } from "../services/storage.service";
import { insertAdminSchema, updateAdminSchema } from "@shared/schema";
import { z } from "zod";
import mongoose from "mongoose";
import { hashPassword } from "../utils/crypto";
import { UserVenueNotificationSubscriptionModel, UserNotificationModel } from "../models/Notification";

export async function logAudit(actorId: string, action: string, targetType: string, targetId: string, metadata: any = {}) {
    await AuditLogModel.create({
        actorUserId: actorId,
        action,
        targetType,
        targetId,
        metadata
    });
}


export const listAdmins = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const query: any = { role: { $in: ["admin", "super_admin"] }, deletedAt: null };
    if (search) {
        query.$or = [
            { email: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } }
        ];
    }

    const admins = await UserModel.find(query)
        .select("-passwordHash")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

    const total = await UserModel.countDocuments(query);
    res.json({ data: admins, total, page, limit });
};

export const createAdmin = async (req: Request, res: Response) => {
    try {
        const input = insertAdminSchema.parse(req.body);
        const actor = req.user as any;

        if (input.role === "super_admin" && actor.role !== "super_admin") {
            return res.status(403).json({ message: "Only Super Admins can create other Super Admins" });
        }

        // venueId is required for admin role (enforced by insertAdminSchema, but double-check)
        if (input.role === "admin" && !input.venueId) {
            return res.status(400).json({ message: "Venue assignment is required for admin users" });
        }

        if (input.venueId) {
            const venue = await VenueModel.findById(input.venueId);
            if (!venue) return res.status(400).json({ message: "Selected venue does not exist" });
        }

        const existing = await UserModel.findOne({ email: input.email });
        if (existing) {
            return res.status(409).json({ message: "Email already in use" });
        }

        const passwordHash = await hashPassword(input.password);
        const newAdmin = await UserModel.create({
            email: input.email,
            passwordHash,
            name: input.name,
            role: input.role,
            status: "active",
            venueId: input.venueId || null,
        });

        // Also create AdminVenueAssignment for access-control if venueId provided
        if (input.venueId) {
            await AdminVenueAssignmentModel.create({
                adminId: newAdmin.id,
                venueId: input.venueId,
                assignedBy: actor.id,
            });
        }

        await logAudit(actor.id, "CREATE_ADMIN", "user", newAdmin.id, { email: input.email, role: input.role, venueId: input.venueId });
        res.status(201).json({ id: newAdmin.id, email: newAdmin.email, role: newAdmin.role, venueId: newAdmin.venueId });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message, issues: err.errors });
        }
        throw err;
    }
};

export const updateAdmin = async (req: Request, res: Response) => {
    try {
        const adminId = req.params.id;
        const input = updateAdminSchema.parse(req.body);
        const actor = req.user as any;

        if (!mongoose.Types.ObjectId.isValid(adminId)) return res.status(400).json({ message: "Invalid ID" });

        // If venueId is being set, validate it exists
        if (input.venueId) {
            const venue = await VenueModel.findById(input.venueId);
            if (!venue) return res.status(400).json({ message: "Selected venue does not exist" });
        }

        const updateFields: any = {};
        if (input.status !== undefined) updateFields.status = input.status;
        if (input.name !== undefined) updateFields.name = input.name;
        if (input.venueId !== undefined) updateFields.venueId = input.venueId;

        const updated = await UserModel.findByIdAndUpdate(
            adminId,
            { $set: updateFields },
            { new: true }
        ).select("-passwordHash");

        if (!updated) return res.status(404).json({ message: "Admin not found" });

        // Sync AdminVenueAssignment if venueId changed
        if (input.venueId !== undefined) {
            await AdminVenueAssignmentModel.deleteMany({ adminId });
            if (input.venueId) {
                await AdminVenueAssignmentModel.create({
                    adminId,
                    venueId: input.venueId,
                    assignedBy: actor.id,
                });
            }
        }

        await logAudit(actor.id, "UPDATE_ADMIN", "user", adminId, updateFields);
        res.json(updated);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message, issues: err.errors });
        }
        throw err;
    }
};

export const deleteAdmin = async (req: Request, res: Response) => {
    const adminId = req.params.id;
    const actor = req.user as any;

    const deleted = await UserModel.findByIdAndUpdate(adminId, {
        deletedAt: new Date(),
        deletedBy: actor.id,
        status: "disabled"
    });

    if (!deleted) return res.status(404).json({ message: "Admin not found" });

    await logAudit(actor.id, "DELETE_ADMIN", "user", adminId, {});
    res.json({ message: "Admin soft deleted" });
};

export const assignVenuesToAdmin = async (req: Request, res: Response) => {
    const adminId = req.params.id;
    const { venueIds } = req.body as { venueIds: string[] };
    const actor = req.user as any;

    if (!Array.isArray(venueIds)) return res.status(400).json({ message: "venueIds must be an array" });

    // Clear existing assignments for this admin
    await AdminVenueAssignmentModel.deleteMany({ adminId });

    if (venueIds.length > 0) {
        const assignments = venueIds.map(vId => ({
            adminId,
            venueId: vId,
            assignedBy: actor.id
        }));
        await AdminVenueAssignmentModel.insertMany(assignments);
    }

    await logAudit(actor.id, "ASSIGN_VENUES", "user", adminId, { venueIds });
    res.json({ message: "Venues assigned successfully" });
};

export const getAdminVenues = async (req: Request, res: Response) => {
    const adminId = req.params.id;
    const assignments = await AdminVenueAssignmentModel.find({ adminId }).populate("venueId");
    res.json(assignments.map(a => a.venueId));
};

export const listAuditLogs = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await AuditLogModel.find()
        .populate("actorUserId", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await AuditLogModel.countDocuments();
    res.json({ data: logs, total, page, limit });
};

/** GET /api/admin/all-users — list regular (non-admin) users for the Promote dialog */
export const listAllUsers = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    const query: any = { role: "user", deletedAt: null };
    if (search) {
        query.$or = [
            { email: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
        ];
    }

    const users = await UserModel.find(query)
        .select("-passwordHash")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

    const total = await UserModel.countDocuments(query);
    res.json({ data: users, total, page, limit });
};

/** POST /api/admin/users/promote — promote a regular user to admin/super_admin */
export const promoteUser = async (req: Request, res: Response) => {
    try {
        const { userId, role, venueId } = req.body as { userId: string; role: string; venueId?: string };
        const actor = req.user as any;

        if (!userId || !role) {
            return res.status(400).json({ message: "userId and role are required" });
        }
        if (!["admin", "super_admin"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }
        if (role === "admin" && !venueId) {
            return res.status(400).json({ message: "Venue assignment is required for admin role" });
        }

        const targetUser = await UserModel.findById(userId);
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        if (venueId) {
            const venue = await VenueModel.findById(venueId);
            if (!venue) return res.status(400).json({ message: "Selected venue does not exist" });
        }

        // Update role (and venueId if provided)
        const updated = await UserModel.findByIdAndUpdate(
            userId,
            { $set: { role, ...(venueId ? { venueId } : {}) } },
            { new: true }
        ).select("-passwordHash");

        // Create venue assignment for admin role
        if (role === "admin" && venueId) {
            await AdminVenueAssignmentModel.deleteMany({ adminId: userId });
            await AdminVenueAssignmentModel.create({ adminId: userId, venueId, assignedBy: actor.id });
        }

        await logAudit(actor.id, "PROMOTE_USER", "user", userId, { role, venueId });
        res.json(updated);
    } catch (err) {
        throw err;
    }
};

export const dispatchNotification = async (req: Request, res: Response) => {
    const venueId = req.params.id;
    const { title, message } = req.body;
    const actor = req.user as any;

    if (!title || !message) return res.status(400).json({ message: "Title and message required" });

    const venue = await VenueModel.findById(venueId);
    if (!venue) return res.status(404).json({ message: "Venue not found" });

    // Find opted in users
    const subscriptions = await UserVenueNotificationSubscriptionModel.find({ venueId, enabled: true });

    if (subscriptions.length > 0) {
        const notifications = subscriptions.map(sub => ({
            userId: sub.userId,
            venueId,
            title,
            message,
            read: false
        }));
        await UserNotificationModel.insertMany(notifications);
    }

    await logAudit(actor.id, "DISPATCH_NOTIFICATION", "venue", venueId, { title, subsCount: subscriptions.length });
    res.json({ message: "Notifications dispatched", count: subscriptions.length });
};
