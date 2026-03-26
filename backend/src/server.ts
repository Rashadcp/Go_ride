import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import mapRoutes from "./routes/map.routes";
import rideRoutes from "./routes/ride.routes";

// New Modular Routes
import taxiRoutes from "./modules/taxi/taxi.routes";
import carpoolRoutes from "./modules/carpool/carpool.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import emergencyRoutes from "./modules/emergency/emergency.routes";
import ratingRoutes from "./modules/rating/rating.routes";

import passport from "./config/passport";

dotenv.config();

import { createServer } from "http";
import { initSocket } from "./config/socket";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// 1. CORS at the TRIPLE TOP to ensure all responses (including errors) have headers
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.56.1:3000",
      "http://192.168.0.103:3000"
    ];
    // During development, allow all local origins and echo them back for compatibility
    if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.')) {
      callback(null, true);
    } else {
      console.log("⚠️ CORS Blocked Origin:", origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// app.use((req, res, next) => {
//   console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
//   next();
// });

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(passport.initialize());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/rides", rideRoutes);

// New Modular endpoints
app.use("/api/taxi", taxiRoutes);
app.use("/api/carpool", carpoolRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/rating", ratingRoutes);

app.get("/", (req, res) => res.send("Go Ride API Running"));

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🏁 Global Error Context:", {
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
httpServer.listen(PORT, () => {
  console.log(`🚀 Server + Real-time System on port ${PORT}`);
});
