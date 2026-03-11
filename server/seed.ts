/**
 * QueueBuddy Seed Script
 * Usage:
 *   npm run db:seed          — seed only if DB is empty
 *   npm run db:reset         — wipe all data, then seed fresh
 *
 * Credentials seeded:
 *   super_admin:  super@queuebuddy.dev / SuperAdmin1!
 *   admin1:       venue1admin@queuebuddy.dev / VenueAdmin1! → Cafe Younes
 *   admin2:       venue2admin@queuebuddy.dev / VenueAdmin1! → Margherita
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
    name: "Cafe Younes",
    location: "Hamra, Beirut",
    address: "Hamra Street, Beirut, Lebanon",
    lat: 33.8950,
    lng: 35.4827,
    description: "One of Beirut’s most famous coffee spots known for its specialty coffee and relaxed atmosphere.",
    capacity: 80,
    openTime: "07:00",
    closeTime: "23:00",
    timezone: "Asia/Beirut",
    category: "cafe" as const,
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24",
    images: ["https://images.unsplash.com/photo-1554118811-1e0d58224f24"],
    status: "active" as const,
  },
  {
    name: "Margherita at Zaitunay Bay",
    location: "Zaitunay Bay, Beirut",
    address: "Zaitunay Bay Marina, Beirut, Lebanon",
    lat: 33.8929,
    lng: 35.4957,
    description: "Italian restaurant with waterfront views at Zaitunay Bay. Perfect for a cozy dinner or seafood evening.",
    capacity: 80,
    openTime: "12:00",
    closeTime: "23:00",
    timezone: "Asia/Beirut",
    category: "restaurant" as const,
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836"],
    status: "active" as const,
  },
  {
    name: "Beirut Digital District",
    location: "Bachoura, Beirut",
    address: "Beirut Digital District, Beirut, Lebanon",
    lat: 33.8938,
    lng: 35.5037,
    description: "Modern coworking and tech hub hosting startups, developers, and entrepreneurs.",
    capacity: 60,
    openTime: "08:00",
    closeTime: "22:00",
    timezone: "Asia/Beirut",
    category: "tech" as const,
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c",
    images: ["https://images.unsplash.com/photo-1497366216548-37526070297c"],
    status: "active" as const,
  },
  {
    name: "Lina's Paris",
    location: "Downtown Beirut",
    address: "Foch Street, Beirut Central District",
    lat: 33.8959,
    lng: 35.5062,
    description: "Popular cafe in downtown Beirut serving sandwiches, pastries and coffee.",
    capacity: 50,
    openTime: "08:00",
    closeTime: "22:00",
    timezone: "Asia/Beirut",
    category: "cafe" as const,
    imageUrl: "https://images.unsplash.com/photo-1445116572660-236099ec97a0",
    images: ["https://images.unsplash.com/photo-1445116572660-236099ec97a0"],
    status: "active" as const,
  },
  {
    name: "Skybar Beirut",
    location: "Biel, Beirut",
    address: "BIEL Waterfront, Beirut",
    lat: 33.9090,
    lng: 35.5113,
    description: "Luxury rooftop lounge and nightlife destination with panoramic city views.",
    capacity: 150,
    openTime: "20:00",
    closeTime: "03:00",
    timezone: "Asia/Beirut",
    category: "restaurant" as const,
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b",
    images: ["https://images.unsplash.com/photo-1514933651103-005eec06c04b"],
    status: "active" as const,
  },
];

// ─── Seat section builder ─────────────────────────────────────────────────────
function buildSeats(venueId: mongoose.Types.ObjectId, sections: { name: string; rows: number; cols: number; type: string }[]) {
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
          row: r, // optional
          col: c, // optional
        });
      }
    }
  }
  return seats;
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────
async function clearAll() {
    console.log("🗑️  Clearing all collections and indexes...");

    // List of all models
    const models = [
        UserModel,
        VenueModel,
        SeatModel,
        ReservationModel,
        AdminVenueAssignmentModel,
        AuditLogModel,
    ];

    for (const model of models) {
        // Delete all documents
        await model.deleteMany({});

        // Drop all indexes if the collection exists
        try {
            await model.collection.dropIndexes();
            console.log(`✅ Dropped indexes for ${model.collection.name}`);
        } catch (err: any) {
            if (err.codeName === "NamespaceNotFound") {
                console.log(`ℹ️ No indexes found for ${model.collection.name}, skipping`);
            } else if (err.code === 26) {
                // NamespaceNotFound (collection doesn't exist yet)
                console.log(`ℹ️ Collection ${model.collection.name} does not exist yet`);
            } else {
                throw err;
            }
        }
    }

    console.log("✅ Collections cleared.");
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
  const [cafeYounes, margherita, beirutDigitalDistrict, linasParis, skybar] = venues;
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
    name: "Cafe Younes Manager",
    role: "admin",
    status: "active",
    venueId: cafeYounes._id,
  });
  const admin2 = await UserModel.create({
    email: "venue2admin@queuebuddy.dev",
    passwordHash: adminHash,
    name: "Margherita Manager",
    role: "admin",
    status: "active",
    venueId: margherita._id,
  });

  await AdminVenueAssignmentModel.insertMany([
    { adminId: admin1._id, venueId: cafeYounes._id, assignedBy: superAdmin._id },
    { adminId: admin2._id, venueId: margherita._id, assignedBy: superAdmin._id },
  ]);

  const userHash = await hashPassword("UserPass1!");
  const userDocs = Array.from({ length: 20 }, (_, i) => ({
    email: `user${String(i + 1).padStart(2, "0")}@example.com`,
    passwordHash: userHash,
    name: `Test User ${i + 1}`,
    role: "user" as const,
    status: i === 19 ? "disabled" : "active",
  }));
  const users = await UserModel.insertMany(userDocs);
  console.log(`   ✅ 1 super_admin, 2 admins, ${users.length} users created`);

  // ── 3. Create seats ──────────────────────────────────────────────────────
  console.log("🎟️  Creating seats...");
  const cafeYounesSeats = await SeatModel.insertMany(buildSeats(cafeYounes._id, [
    { name: "Window Tables", rows: 2, cols: 4, type: "premium" },
    { name: "Main Area", rows: 3, cols: 6, type: "standard" },
    { name: "Coffee Bar", rows: 1, cols: 6, type: "standard" },
  ]));
  await SeatModel.updateOne({ venueId: cafeYounes._id, label: "B3" }, { status: "disabled" });

  const margheritaSeats = await SeatModel.insertMany(buildSeats(margherita._id, [
    { name: "Terrace", rows: 3, cols: 5, type: "premium" },
    { name: "Indoor Dining", rows: 4, cols: 6, type: "standard" },
    { name: "Bar", rows: 1, cols: 8, type: "standard" },
  ]));

  const bddSeats = await SeatModel.insertMany(buildSeats(beirutDigitalDistrict._id, [
    { name: "Window Desks", rows: 2, cols: 6, type: "standard" },
    { name: "Quiet Zone", rows: 2, cols: 6, type: "standard" },
    { name: "Collaborative Area", rows: 2, cols: 8, type: "premium" },
  ]));

  const linasSeats = await SeatModel.insertMany(buildSeats(linasParis._id, [
    { name: "Window", rows: 2, cols: 4, type: "standard" },
    { name: "Interior", rows: 3, cols: 5, type: "standard" },
  ]));

  const skybarSeats = await SeatModel.insertMany(buildSeats(skybar._id, [
    { name: "VIP Lounge", rows: 2, cols: 6, type: "premium" },
    { name: "Main Floor", rows: 4, cols: 8, type: "standard" },
    { name: "Bar Counter", rows: 1, cols: 10, type: "standard" },
  ]));
  await SeatModel.updateOne({ venueId: skybar._id, label: "C4" }, { status: "disabled" });
  console.log("   ✅ Seats created for all venues");

  // ── 4. Reservations ───────────────────────────────────────────────────────
  console.log("📅 Creating sample reservations...");
  const now = new Date();
  const activeSeatDocs = cafeYounesSeats.slice(0, 5);
  const activeReservations = activeSeatDocs.map((seat, i) => ({
    userId: users[i]._id,
    venueId: cafeYounes._id,
    seatId: seat._id,
    durationMinutes: 90,
    startTime: new Date(now.getTime() - 15 * 60000),
    endTime: new Date(now.getTime() + 75 * 60000),
    status: "active" as const,
  }));
  await ReservationModel.insertMany(activeReservations);
  await SeatModel.updateMany({ _id: { $in: activeSeatDocs.map(s => s._id) } }, { status: "occupied" });

  const skybarActive = skybarSeats.slice(0, 8);
  await ReservationModel.insertMany(
    skybarActive.map((seat, i) => ({
      userId: users[5 + i]._id,
      venueId: skybar._id,
      seatId: seat._id,
      durationMinutes: 120,
      startTime: new Date(now.getTime() - 30 * 60000),
      endTime: new Date(now.getTime() + 90 * 60000),
      status: "active" as const,
    }))
  );
  await SeatModel.updateMany({ _id: { $in: skybarActive.map(s => s._id) } }, { status: "occupied" });

  const pastTime = new Date(now.getTime() - 3600000);
  await ReservationModel.insertMany(
    cafeYounesSeats.slice(10, 15).map((seat, i) => ({
      userId: users[i]._id,
      venueId: cafeYounes._id,
      seatId: seat._id,
      durationMinutes: 60,
      startTime: new Date(pastTime.getTime() - 60 * 60000),
      endTime: pastTime,
      status: "expired" as const,
    }))
  );
  await ReservationModel.insertMany(
    cafeYounesSeats.slice(15, 18).map((seat, i) => ({
      userId: users[i]._id,
      venueId: cafeYounes._id,
      seatId: seat._id,
      durationMinutes: 45,
      startTime: new Date(pastTime.getTime() - 2 * 3600000),
      endTime: new Date(pastTime.getTime() - 1.25 * 3600000),
      status: "cancelled" as const,
    }))
  );
  console.log(`   ✅ Reservations seeded (active, expired, cancelled)`);

  // ── 5. Update capacities ─────────────────────────────────────────────────
  await VenueModel.findByIdAndUpdate(cafeYounes._id, { capacity: cafeYounesSeats.length });
  await VenueModel.findByIdAndUpdate(margherita._id, { capacity: margheritaSeats.length });
  await VenueModel.findByIdAndUpdate(beirutDigitalDistrict._id, { capacity: bddSeats.length });
  await VenueModel.findByIdAndUpdate(linasParis._id, { capacity: linasSeats.length });
  await VenueModel.findByIdAndUpdate(skybar._id, { capacity: skybarSeats.length });

  console.log("\n✅ Seed complete!\n");
  console.log("─────────────────────────────────────────────────");
  console.log("🔑 Login credentials:");
  console.log("  Super Admin:  super@queuebuddy.dev        / SuperAdmin1!");
  console.log("  Venue Admin1: venue1admin@queuebuddy.dev  / VenueAdmin1!  (Cafe Younes)");
  console.log("  Venue Admin2: venue2admin@queuebuddy.dev  / VenueAdmin1!  (Margherita)");
  console.log("  Users:        user01..user20@example.com  / UserPass1!");
  console.log("  (user20 is disabled for testing)");
  console.log("─────────────────────────────────────────────────\n");

  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});