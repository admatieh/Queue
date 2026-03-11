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

const VENUES = [
  {
    name: "Cafe Younes",
    location: "Hamra, Beirut",
    address: "Hamra Street, Beirut, Lebanon",
    lat: 33.895,
    lng: 35.4827,
    description:
      "One of Beirut’s most famous coffee spots known for its specialty coffee and relaxed atmosphere.",
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
    description:
      "Italian restaurant with waterfront views at Zaitunay Bay.",
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
    description:
      "Modern coworking and tech hub hosting startups and developers.",
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
    description:
      "Popular cafe in downtown Beirut serving sandwiches and pastries.",
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
    lat: 33.909,
    lng: 35.5113,
    description:
      "Luxury rooftop lounge and nightlife destination.",
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

function buildSeats(
  venueId: mongoose.Types.ObjectId,
  sections: { name: string; rows: number; cols: number; type: string }[]
) {
  const seats: any[] = [];
  let globalRow = 0;

  for (const section of sections) {
    for (let r = 0; r < section.rows; r++) {
      const rowLabel = String.fromCharCode(65 + globalRow);
      for (let c = 1; c <= section.cols; c++) {
        seats.push({
          venueId,
          label: `${rowLabel}${c}`,
          section: section.name,
          type: section.type,
          locationDescription: `${section.name} — Row ${rowLabel}, Seat ${c}`,
          status: "available",
          x: (c - 1) * 60,
          y: globalRow * 60,
          row: globalRow,
          col: c,
        });
      }
      globalRow++;
    }
  }

  return seats;
}

async function clearAll() {
  console.log("🗑️ Clearing database...");

  const models: mongoose.Model<any>[] = [
    UserModel,
    VenueModel,
    SeatModel,
    ReservationModel,
    AdminVenueAssignmentModel,
    AuditLogModel,
  ];

  for (const model of models) {
    try {
      await model.deleteMany({});
      console.log(`✅ Cleared ${model.collection.name}`);
    } catch (err) {
      console.log(`⚠️ Could not clear ${model.collection.name}`);
    }
  }
}

// ── Helper: pick random seats ─────────────────────────
function getRandomSeats(seats: any[], count: number) {
  const shuffled = [...seats].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ── Seed function ─────────────────────────
async function seed() {
  await connectMongo();

  if (RESET) {
    await clearAll();
  } else {
    const count = await VenueModel.countDocuments();
    if (count > 0) {
      console.log("ℹ️ Database already seeded.");
      process.exit(0);
    }
  }

  console.log("🌱 Seeding database...");

  const venues = await VenueModel.insertMany(VENUES);
  const [cafeYounes, margherita, bdd, linas, skybar] = venues;

  const superAdminHash = await hashPassword("SuperAdmin1!");
  const superAdmin = await UserModel.create({
    email: "super@queuebuddy.dev",
    passwordHash: superAdminHash,
    name: "Super Administrator",
    role: "super_admin",
    status: "active",
  });

  const adminHash = await hashPassword("VenueAdmin1!");
  const admins = [
    { email: "venue1admin@queuebuddy.dev", name: "Cafe Younes Manager", venue: cafeYounes },
    { email: "venue2admin@queuebuddy.dev", name: "Margherita Manager", venue: margherita },
    { email: "venue3admin@queuebuddy.dev", name: "BDD Manager", venue: bdd },
    { email: "venue4admin@queuebuddy.dev", name: "Linas Manager", venue: linas },
    { email: "venue5admin@queuebuddy.dev", name: "Skybar Manager", venue: skybar },
  ];

  const adminUsers = [];
  for (const a of admins) {
    const admin = await UserModel.create({
      email: a.email,
      passwordHash: adminHash,
      name: a.name,
      role: "admin",
      venueId: a.venue._id,
      status: "active",
    });
    adminUsers.push(admin);
    await AdminVenueAssignmentModel.create({ adminId: admin._id, venueId: a.venue._id, assignedBy: superAdmin._id });
  }

  const userHash = await hashPassword("UserPass1!");
  const users = await UserModel.insertMany(
    Array.from({ length: 20 }, (_, i) => ({
      email: `user${String(i + 1).padStart(2, "0")}@example.com`,
      passwordHash: userHash,
      name: `Test User ${i + 1}`,
      role: "user",
      status: i === 19 ? "disabled" : "active",
    }))
  );

  const now = new Date();

  // ── Seats ─────────────────────────
  const cafeSeats = await SeatModel.insertMany(
    buildSeats(cafeYounes._id, [
      { name: "Window Tables", rows: 2, cols: 4, type: "premium" },
      { name: "Main Area", rows: 3, cols: 6, type: "standard" },
      { name: "Coffee Bar", rows: 1, cols: 6, type: "standard" },
    ])
  );

  const skySeats = await SeatModel.insertMany(
    buildSeats(skybar._id, [
      { name: "VIP Lounge", rows: 2, cols: 6, type: "premium" },
      { name: "Main Floor", rows: 4, cols: 8, type: "standard" },
      { name: "Bar Counter", rows: 1, cols: 10, type: "standard" },
    ])
  );

  const margheritaSeats = await SeatModel.insertMany(
    buildSeats(margherita._id, [
      { name: "Terrace", rows: 3, cols: 5, type: "premium" },
      { name: "Indoor Dining", rows: 4, cols: 6, type: "standard" },
      { name: "Bar", rows: 1, cols: 8, type: "standard" },
    ])
  );

  const bddSeats = await SeatModel.insertMany(
    buildSeats(bdd._id, [
      { name: "Window Desks", rows: 2, cols: 6, type: "standard" },
      { name: "Quiet Zone", rows: 2, cols: 6, type: "standard" },
      { name: "Collaborative Area", rows: 2, cols: 8, type: "premium" },
    ])
  );

  const linasSeats = await SeatModel.insertMany(
    buildSeats(linas._id, [
      { name: "Window", rows: 2, cols: 4, type: "standard" },
      { name: "Interior", rows: 2, cols: 5, type: "standard" },
    ])
  );

  // ── Random reservations for Cafe Younes ───────────────
  const randomCafeSeats = getRandomSeats(cafeSeats, 10); // 10 random seats
  await ReservationModel.insertMany(
    randomCafeSeats.map((seat, i) => ({
      userId: users[i % users.length]._id,
      venueId: cafeYounes._id,
      seatId: seat._id,
      durationMinutes: 90,
      startTime: new Date(now.getTime() - Math.floor(Math.random() * 30) * 60000),
      endTime: new Date(now.getTime() + Math.floor(Math.random() * 90) * 60000),
      status: "active" as const,
    }))
  );

  await SeatModel.updateMany(
    { _id: { $in: randomCafeSeats.map(s => s._id) } },
    { status: "occupied" }
  );

  console.log("\n✅ Seed complete\n");
  console.log("Super Admin: super@queuebuddy.dev / SuperAdmin1!");
  console.log("Admins: venue1admin@queuebuddy.dev / VenueAdmin1!, venue2admin@queuebuddy.dev / VenueAdmin1!");
  console.log("Users: user01..user20@example.com / UserPass1!");

  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});