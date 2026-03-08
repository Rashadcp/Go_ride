import jwt from "jsonwebtoken";

export const generateAccessToken = (user: any) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_ACCESS_SECRET || "access_secret",
        { expiresIn: "15m" }
    );
};

export const generateRefreshToken = (user: any) => {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || "refresh_secret",
        { expiresIn: "7d" }
    );
};
