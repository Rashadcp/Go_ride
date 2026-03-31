"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProtect = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../../models/user"));
const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Not authorized" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || "access_secret");
        // Fetch user from database to check for block/delete status
        const user = await user_1.default.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        if (user.isBlocked) {
            return res.status(403).json({ message: "Your account has been blocked by an administrator." });
        }
        if (user.isDeleted) {
            return res.status(401).json({ message: "This account has been deleted." });
        }
        req.user = user;
        next();
    }
    catch (err) {
        res.status(401).json({ message: "Token is invalid" });
    }
};
exports.protect = protect;
const adminProtect = (req, res, next) => {
    if (req.user && req.user.role === "ADMIN") {
        next();
    }
    else {
        res.status(403).json({ message: "Access denied: Admins only" });
    }
};
exports.adminProtect = adminProtect;
