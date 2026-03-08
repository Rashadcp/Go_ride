import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import passport from "./config/passport";

dotenv.config();

const app = express();

// 1. CORS at the TRIPLE TOP to ensure all responses (including errors) have headers
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 2. Request Logger (Safe check for body)
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Body:", req.body);
  }
  next();
});

app.use(express.json());
app.use(passport.initialize());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server on port ${PORT}`);
});