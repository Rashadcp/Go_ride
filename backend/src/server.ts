import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from "./modules/admin/admin.routes";
import vehicleRoutes from "./modules/vehicle/vehicle.routes";
import mapRoutes from "./modules/map/map.routes";
import rideRoutes from "./modules/ride/ride.routes";

import taxiRoutes from "./modules/taxi/taxi.routes";
import carpoolRoutes from "./modules/carpool/carpool.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import emergencyRoutes from "./modules/emergency/emergency.routes";
import ratingRoutes from "./modules/rating/rating.routes";
import notificationRoutes from "./modules/notification/notification.routes";

import passport from "./config/passport";
import { closeRedisConnections, connectRedis } from "./config/redis";

dotenv.config();

import { createServer } from "http";
import { initSocket } from "./config/socket";

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.56.1:3000",
      "http://192.168.0.103:3000"
    ];

    if (!origin || allowedOrigins.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1") || origin.startsWith("http://192.168.")) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(passport.initialize());

const connectMongo = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
};

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/rides", rideRoutes);

app.use("/api/taxi", taxiRoutes);
app.use("/api/carpool", carpoolRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => res.send("Go Ride API Running"));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Error Context:", {
    method: req.method,
    url: req.url,
    error: err.message || err,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });

  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred on the server.",
    error: process.env.NODE_ENV === "development" ? err : undefined
  });
});

const PORT = Number(process.env.PORT) || 5000;

const bootstrap = async () => {
  await connectMongo();
  await connectRedis();
  await initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server + real-time system on port ${PORT}`);
  });
};

void bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

const shutdown = async () => {
  await closeRedisConnections();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
