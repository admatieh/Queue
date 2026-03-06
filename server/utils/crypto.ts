import bcrypt from "bcrypt";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const BCRYPT_ROUNDS = 12;
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using bcrypt (cost factor 12).
 * All new passwords use bcrypt. Legacy passwords used scrypt and are
 * transparently handled in comparePasswords without re-hashing.
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a supplied plaintext password against a stored hash.
 *
 * Supports two formats:
 *   - bcrypt:  stored starts with "$2b$" or "$2a$"  (new standard)
 *   - scrypt:  stored is "hexhash.hexsalt"           (legacy — users who registered before the bcrypt migration)
 *
 * This dual-detection means existing user accounts continue to work
 * without any data migration. Only admin accounts created via the API
 * ever used bcrypt; all signup-registered users used scrypt.
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
    // bcrypt hashes always start with $2b$ or $2a$
    if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
        return bcrypt.compare(supplied, stored);
    }

    // Legacy scrypt format: "hexhash.hexsalt"
    const parts = stored.split(".");
    if (parts.length !== 2) {
        // Malformed hash — fail safely
        return false;
    }
    const [hashed, salt] = parts;
    if (!hashed || !salt) return false;

    try {
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        // timingSafeEqual requires same length buffers
        if (hashedBuf.length !== suppliedBuf.length) return false;
        return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch {
        return false;
    }
}
