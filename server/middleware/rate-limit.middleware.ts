import rateLimit from "express-rate-limit";

/** Rate limiter for authentication endpoints (login, register). */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // max 20 attempts per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again later." },
});
