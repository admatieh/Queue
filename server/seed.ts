/**
 * QueueBuddy Seed Script
 * Usage:
 *   npm run db:seed          — seed only if DB is empty
 *   npm run db:reset         — wipe all data, then seed fresh
 *
 * Credentials seeded:
 *   super_admin:  super@queuebuddy.dev / SuperAdmin1!
 *   admin1:       venue1admin@queuebuddy.dev / VenueAdmin1!   → The Jazz Cellar
 *   admin2:       venue2admin@queuebuddy.dev / VenueAdmin1!   → Rooftop Lounge
 *   users:        user01..user20@example.com / UserPass1!
 */
import { connectMongo } from "./db/mongo";
import { UserModel } from "./models/User";
import { VenueModel } from "./models/Venue";
import { SeatModel } from "./models/Seat";
import { ReservationModel } from "./models/Reservation";
import { AdminVenueAssignmentModel } from "./models/AdminVenueAssignment";
import { AuditLogModel } from "./models/AuditLog";
import { hashPassword } from "./utils/crypto";
import mongoose from "mongoose";

const RESET = process.argv.includes("--reset");

// ─── Venue data ──────────────────────────────────────────────────────────────
const VENUES = [
    {
        name: "The Jazz Cellar",
        location: "Downtown Manhattan",
        address: "45 W 21st St, New York, NY 10010",
        lat: 40.7440, lng: -73.9937,
        description: "Underground jazz club with intimate booth seating, craft cocktails, and live performances every night. The perfect spot for a nightcap in NYC.",
        capacity: 80,
        openTime: "18:00", closeTime: "02:00",
        timezone: "America/New_York",
        category: "restaurant" as const,
        imageUrl: "/uploads/placeholder-jazz.jpg",
        images: ["/uploads/placeholder-jazz.jpg"],
        status: "active" as const,
    },
    {
        name: "Rooftop Lounge",
        location: "Brooklyn Heights",
        address: "1 Hotel Court Sq, Long Island City, NY 11101",
        lat: 40.7489, lng: -73.9400,
        description: "Panoramic rooftop terrace with skyline views, craft beer on tap, and seasonal menus. Heated in winter, shaded in summer.",
        capacity: 120,
        openTime: "12:00", closeTime: "23:00",
        timezone: "America/New_York",
        category: "cafe" as const,
        imageUrl: "/uploads/placeholder-rooftop.jpg",
        images: ["/uploads/placeholder-rooftop.jpg"],
        status: "active" as const,
    },
    {
        name: "TechHub Co-working",
        location: "SoHo, New York",
        address: "568 Broadway, New York, NY 10012",
        lat: 40.7237, lng: -73.9983,
        description: "Premium co-working space with standing desks, private pods, ultra-fast fibre, and unlimited espresso. Day passes and hourly rates available.",
        capacity: 60,
        openTime: "07:00", closeTime: "22:00",
        timezone: "America/New_York",
        category: "tech" as const,
        imageUrl: null,
        images: [],
        status: "active" as const,
    },
    {
        name: "Café Noir",
        location: "West Village",
        address: "122 Christopher St, New York, NY 10014",
        lat: 40.7330, lng: -74.0044,
        description: "Art deco-inspired café with intimate seating alcoves, specialty single-origin coffee, and rotating exhibitions by local artists.",
        capacity: 45,
        openTime: "08:00", closeTime: "20:00",
        timezone: "America/New_York",
        category: "cafe" as const,
        imageUrl: null,
        images: [],
        status: "active" as const,
    },
    {
        name: "The Library Bar",
        location: "Upper East Side",
        address: "The Surrey, 20 E 76th St, New York, NY 10021",
        lat: 40.7745, lng: -73.9637,
        description: "Reservations-only whisky bar styled as a private members library. Rare single malts, vintage cognac, and leather armchairs.",
        capacity: 30,
        openTime: "17:00", closeTime: "01:00",
        timezone: "America/New_York",
        category: "restaurant" as const,
        imageUrl: null,
        images: [],
        status: "active" as const,
    },
    {
        name: "Station Digital Lounge",
        location: "Midtown West",
        address: "441 9th Ave, New York, NY 10001",
        lat: 40.7525, lng: -74.0015,
        description: "Gaming and productivity lounge with high-end PC stations, console booths, and ultra-low-latency internet. Perfect for esports sessions.",
        capacity: 50,
        openTime: "10:00", closeTime: "23:00",
        timezone: "America/New_York",
        category: "tech" as const,
        imageUrl: null,
        images: [],
        status: "active" as const,
    },
    {
        name: "Eataly Terrace",
        location: "Flatiron District",
        address: "200 5th Ave, New York, NY 10010",
        lat: 40.7432, lng: -73.9882,
        description: "Elevated dining terrace above the famous Italian marketplace. Regional pasta, cured meats, and natural wine in a lively communal setting.",
        capacity: 100,
        openTime: "11:00", closeTime: "22:00",
        timezone: "America/New_York",
        category: "restaurant" as const,
        imageUrl: null,
        images: [],
        status: "active" as const,
    },
    {
        name: "Closed For Maintenance",
        location: "Tribeca",
        address: "1 Franklin Place, New York, NY 10013",
        lat: 40.7191, lng: -74.0078,
        description: "Temporarily unavailable.",
        capacity: 20,
        openTime: "09:00", closeTime: "22:00",
        timezone: "America/New_York",
        category: "tech" as const,
        imageUrl: null,
        images: [],
        status: "disabled" as const,
    },
];

// ─── Seat section builder ─────────────────────────────────────────────────────
function buildSeats(venueId: string, sections: { name: string; rows: number; cols: number; type: string }[]) {
    const seats: any[] = [];
    for (const section of sections) {
        for (let r = 0; r < section.rows; r++) {
            for (let c = 1; c <= section.cols; c++) {
                const rowLabel = String.fromCharCode(65 + r); // A, B, C...
                seats.push({
                    venueId,
                    label: `${rowLabel}${c}`,
                    section: section.name,
                    type: section.type,
                    locationDescription: `${section.name} — Row ${rowLabel}, Seat ${c}`,
                    status: "available",
                    x: c * 60,
                    y: r * 60,
                });
            }
        }
    }
    return seats;
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────
async function clearAll() {
    console.log("🗑️  Clearing all collections...");
    await Promise.all([
        UserModel.deleteMany({}),
        VenueModel.deleteMany({}),
        SeatModel.deleteMany({}),
        ReservationModel.deleteMany({}),
        AdminVenueAssignmentModel.deleteMany({}),
        AuditLogModel.deleteMany({}),
    ]);
    console.log("✅  Collections cleared.");
}

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed() {
    await connectMongo();

    if (RESET) {
        await clearAll();
    } else {
        const venueCount = await VenueModel.countDocuments();
        if (venueCount > 0) {
            console.log("ℹ️  Database already has data. Run with --reset to re-seed.");
            process.exit(0);
        }
    }

    console.log("🌱 Seeding database...\n");

    // ── 1. Create venues ─────────────────────────────────────────────────────
    console.log("📍 Creating venues...");
    const venues = await VenueModel.insertMany(VENUES);
    const [jazzCellar, rooftopLounge, techHub, cafeNoir, libraryBar, stationLounge, eatalyTerrace, closedVenue] = venues;
    console.log(`   ✅ ${venues.length} venues created`);

    // ── 2. Create users ──────────────────────────────────────────────────────
    console.log("👤 Creating users...");

    const superAdminHash = await hashPassword("SuperAdmin1!");
    const superAdmin = await UserModel.create({
        email: "super@queuebuddy.dev",
        passwordHash: superAdminHash,
        name: "Super Administrator",
        role: "super_admin",
        status: "active",
    });

    const adminHash = await hashPassword("VenueAdmin1!");
    const admin1 = await UserModel.create({
        email: "venue1admin@queuebuddy.dev",
        passwordHash: adminHash,
        name: "Jazz Cellar Manager",
        role: "admin",
        status: "active",
        venueId: jazzCellar._id,
    });

    const admin2 = await UserModel.create({
        email: "venue2admin@queuebuddy.dev",
        passwordHash: adminHash,
        name: "Rooftop Lounge Manager",
        role: "admin",
        status: "active",
        venueId: rooftopLounge._id,
    });

    // Admin venue assignments
    await AdminVenueAssignmentModel.insertMany([
        { adminId: admin1._id, venueId: jazzCellar._id, assignedBy: superAdmin._id },
        { adminId: admin2._id, venueId: rooftopLounge._id, assignedBy: superAdmin._id },
    ]);

    // 20 regular users
    const userHash = await hashPassword("UserPass1!");
    const userDocs = Array.from({ length: 20 }, (_, i) => ({
        email: `user${String(i + 1).padStart(2, "0")}@example.com`,
        passwordHash: userHash,
        name: `Test User ${i + 1}`,
        role: "user" as const,
        status: (i === 19 ? "disabled" : "active") as "active" | "disabled", // user20 is disabled
    }));
    const users = await UserModel.insertMany(userDocs);
    console.log(`   ✅ 1 super_admin, 2 admins, ${users.length} users created`);

    // ── 3. Create seats ──────────────────────────────────────────────────────
    console.log("🎟️  Creating seats...");

    const jazzSeats = await SeatModel.insertMany([
        ...buildSeats(jazzCellar._id.toString(), [
            { name: "Bar", rows: 1, cols: 8, type: "bar" },
            { name: "Booth", rows: 4, cols: 6, type: "premium" },
            { name: "Floor", rows: 5, cols: 8, type: "standard" },
        ]),
    ]);
    // Disable a few
    await SeatModel.updateOne({ venueId: jazzCellar._id, label: "C3" }, { status: "disabled" });
    await SeatModel.updateOne({ venueId: jazzCellar._id, label: "E7" }, { status: "disabled" });

    const rooftopSeats = await SeatModel.insertMany([
        ...buildSeats(rooftopLounge._id.toString(), [
            { name: "Skyline Terrace", rows: 4, cols: 8, type: "premium" },
            { name: "Garden Level", rows: 5, cols: 8, type: "standard" },
            { name: "Bar Counter", rows: 1, cols: 10, type: "bar" },
        ]),
    ]);

    await SeatModel.insertMany([
        ...buildSeats(techHub._id.toString(), [
            { name: "Window Desks", rows: 2, cols: 6, type: "standard" },
            { name: "Quiet Zone", rows: 2, cols: 6, type: "standard" },
            { name: "Collaborative", rows: 2, cols: 8, type: "premium" },
        ]),
    ]);

    await SeatModel.insertMany([
        ...buildSeats(cafeNoir._id.toString(), [
            { name: "Window", rows: 2, cols: 4, type: "standard" },
            { name: "Interior", rows: 3, cols: 5, type: "standard" },
        ]),
    ]);

    await SeatModel.insertMany([
        ...buildSeats(libraryBar._id.toString(), [
            { name: "Armchairs", rows: 3, cols: 4, type: "premium" },
            { name: "Bar Stools", rows: 1, cols: 6, type: "bar" },
        ]),
    ]);

    await SeatModel.insertMany([
        ...buildSeats(stationLounge._id.toString(), [
            { name: "PC Stations", rows: 3, cols: 8, type: "standard" },
            { name: "Console Booths", rows: 2, cols: 4, type: "premium" },
        ]),
    ]);

    await SeatModel.insertMany([
        ...buildSeats(eatalyTerrace._id.toString(), [
            { name: "Terrace Main", rows: 5, cols: 8, type: "standard" },
            { name: "Corner Booths", rows: 3, cols: 5, type: "premium" },
            { name: "Bar", rows: 1, cols: 10, type: "bar" },
        ]),
    ]);

    console.log(`   ✅ Seats created for all venues`);

    // ── 4. Seed some reservations ────────────────────────────────────────────
    console.log("📅 Creating sample reservations...");

    const now = new Date();

    // Active reservations (current)
    const activeSeatDocs = jazzSeats.slice(0, 5);
    const activeReservations = activeSeatDocs.map((seat, i) => ({
        userId: users[i]._id,
        venueId: jazzCellar._id,
        seatId: seat._id,
        durationMinutes: 90,
        startTime: new Date(now.getTime() - 15 * 60000),
        endTime: new Date(now.getTime() + 75 * 60000),
        status: "active" as const,
    }));
    await ReservationModel.insertMany(activeReservations);
    // Mark those seats as occupied
    await SeatModel.updateMany(
        { _id: { $in: activeSeatDocs.map(s => s._id) } },
        { status: "occupied" }
    );

    // Rooftop active reservations
    const rooftopActive = rooftopSeats.slice(0, 8);
    await ReservationModel.insertMany(
        rooftopActive.map((seat, i) => ({
            userId: users[5 + i]._id,
            venueId: rooftopLounge._id,
            seatId: seat._id,
            durationMinutes: 120,
            startTime: new Date(now.getTime() - 30 * 60000),
            endTime: new Date(now.getTime() + 90 * 60000),
            status: "active" as const,
        }))
    );
    await SeatModel.updateMany(
        { _id: { $in: rooftopActive.map(s => s._id) } },
        { status: "occupied" }
    );

    // Expired reservations (historical)
    const pastTime = new Date(now.getTime() - 3600000);
    await ReservationModel.insertMany(
        jazzSeats.slice(10, 15).map((seat, i) => ({
            userId: users[i]._id,
            venueId: jazzCellar._id,
            seatId: seat._id,
            durationMinutes: 60,
            startTime: new Date(pastTime.getTime() - 60 * 60000),
            endTime: pastTime,
            status: "expired" as const,
        }))
    );

    // Cancelled reservations
    await ReservationModel.insertMany(
        jazzSeats.slice(15, 18).map((seat, i) => ({
            userId: users[i]._id,
            venueId: jazzCellar._id,
            seatId: seat._id,
            durationMinutes: 45,
            startTime: new Date(pastTime.getTime() - 2 * 3600000),
            endTime: new Date(pastTime.getTime() - 1.25 * 3600000),
            status: "cancelled" as const,
        }))
    );

    console.log(`   ✅ Reservations seeded (active, expired, cancelled)`);

    // ── 5. Update venue capacities ────────────────────────────────────────────
    await VenueModel.findByIdAndUpdate(jazzCellar._id, {
        capacity: jazzSeats.length
    });
    await VenueModel.findByIdAndUpdate(rooftopLounge._id, {
        capacity: rooftopSeats.length
    });

    // ── Done ─────────────────────────────────────────────────────────────────
    console.log("\n✅ Seed complete!\n");
    console.log("─────────────────────────────────────────────────");
    console.log("🔑 Login credentials:");
    console.log("  Super Admin:  super@queuebuddy.dev        / SuperAdmin1!");
    console.log("  Venue Admin1: venue1admin@queuebuddy.dev  / VenueAdmin1!  (The Jazz Cellar)");
    console.log("  Venue Admin2: venue2admin@queuebuddy.dev  / VenueAdmin1!  (Rooftop Lounge)");
    console.log("  Users:        user01..user20@example.com  / UserPass1!");
    console.log("  (user20 is disabled for testing)");
    console.log("─────────────────────────────────────────────────\n");

    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
