"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const vehicle_routes_1 = __importDefault(require("./modules/vehicle/vehicle.routes"));
const map_routes_1 = __importDefault(require("./modules/map/map.routes"));
const ride_routes_1 = __importDefault(require("./modules/ride/ride.routes"));
const taxi_routes_1 = __importDefault(require("./modules/taxi/taxi.routes"));
const carpool_routes_1 = __importDefault(require("./modules/carpool/carpool.routes"));
const payment_routes_1 = __importDefault(require("./modules/payment/payment.routes"));
const emergency_routes_1 = __importDefault(require("./modules/emergency/emergency.routes"));
const rating_routes_1 = __importDefault(require("./modules/rating/rating.routes"));
const notification_routes_1 = __importDefault(require("./modules/notification/notification.routes"));
const passport_1 = __importDefault(require("./config/passport"));
const redis_1 = require("./config/redis");
dotenv_1.default.config();
const http_1 = require("http");
const socket_1 = require("./config/socket");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
app.use((0, cors_1.default)({
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
        }
        else {
            console.log("CORS blocked origin:", origin);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express_1.default.json());
app.use("/uploads", express_1.default.static("uploads"));
app.use(passport_1.default.initialize());
const connectMongo = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not configured");
    }
    await mongoose_1.default.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
};
app.use("/api/auth", auth_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/vehicles", vehicle_routes_1.default);
app.use("/api/map", map_routes_1.default);
app.use("/api/rides", ride_routes_1.default);
app.use("/api/taxi", taxi_routes_1.default);
app.use("/api/carpool", carpool_routes_1.default);
app.use("/api/payment", payment_routes_1.default);
app.use("/api/emergency", emergency_routes_1.default);
app.use("/api/rating", rating_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.get("/", (req, res) => res.send("Go Ride API Running"));
app.use((err, req, res, next) => {
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
    await (0, redis_1.connectRedis)();
    await (0, socket_1.initSocket)(httpServer);
    httpServer.listen(PORT, () => {
        console.log(`Server + real-time system on port ${PORT}`);
    });
};
void bootstrap().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
const shutdown = async () => {
    await (0, redis_1.closeRedisConnections)();
    process.exit(0);
};
process.on("SIGINT", () => {
    void shutdown();
});
process.on("SIGTERM", () => {
    void shutdown();
});
