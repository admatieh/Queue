import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { serveStatic } from "./config/static";
import { createServer } from "http";
import path from "path";
import cookieParser from "cookie-parser";
import { Server as SocketIOServer } from "socket.io";

const app = express(); // ✅ define app first
const httpServer = createServer(app);

//for real-time notifications
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // replace with frontend URL in production
  },
});

// Export io so other files can use it
export { io };
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Listen for user registering their ID
  socket.on("register", (userId: string) => {
    socket.join(userId); // creates a room per user
    console.log(`User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


// --- MIDDLEWARES ---
app.use(cookieParser());

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// --- LOGGING HELPER ---
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// --- REQUEST LOGGER ---
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// --- MAIN STARTUP ---
(async () => {
  // Database connection
  const { connectMongo } = await import("./db/mongo");
  await connectMongo();

  // Serve uploaded images
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // Expiry cron job every 60s
  const { storage } = await import("./services/storage.service");
  setInterval(() => {
    storage.expireReservations().catch(err => console.error("Expiry job failed:", err));
  }, 60000);

  // Register routes
  await registerRoutes(httpServer, app);

  // Global error handler
  const { errorHandler } = await import("./middleware/error.middleware");
  app.use(errorHandler);

  // Serve frontend static files in production
  if (app.get("env") === "production") {
    serveStatic(app);
  }

  // Start server
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();