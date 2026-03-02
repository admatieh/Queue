/**
 * Express global type augmentations for JWT auth.
 *
 * Previously, passport augmented req.user via its own typings.
 * Since we removed passport, we declare req.user ourselves here
 * so every controller can do `req.user as User` without TS errors.
 */
import type { User } from "@shared/schema";

declare global {
    namespace Express {
        // Augment the Express Request interface so req.user is always available
        interface Request {
            user?: User;
        }
    }
}
