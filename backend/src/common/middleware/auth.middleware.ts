import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../../models/user";

export const protect = async (req: any, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Not authorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || "access_secret") as any;
        
        // Fetch user from database to check for block/delete status
        const user = await User.findById(decoded.id);
        
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
    } catch (err) {
        res.status(401).json({ message: "Token is invalid" });
    }
};

export const adminProtect = (req: any, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === "ADMIN") {
        next();
    } else {
        res.status(403).json({ message: "Access denied: Admins only" });
    }
};
