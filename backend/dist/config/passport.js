"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const dotenv_1 = __importDefault(require("dotenv"));
const user_1 = __importDefault(require("../models/user"));
dotenv_1.default.config();
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5001/api/auth/google/callback",
    passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const desiredRoleRaw = typeof req?.query?.state === "string" ? req.query.state : undefined;
        const desiredRole = desiredRoleRaw === "DRIVER" || desiredRoleRaw === "USER" ? desiredRoleRaw : undefined;
        console.log(`🔍 Google Auth callback triggered. Desired Role: ${desiredRole || 'none'}`);
        const googleEmail = profile.emails?.[0].value.toLowerCase();
        // try find existing user by googleId or email
        let user = await user_1.default.findOne({ googleId: profile.id });
        if (!user && googleEmail) {
            user = await user_1.default.findOne({ email: googleEmail });
        }
        if (user) {
            let changed = false;
            // if user exists but doesn't have googleId set, update it
            if (!user.googleId) {
                user.googleId = profile.id;
                changed = true;
            }
            // If role was explicitly chosen (register flow), apply it.
            if (desiredRole && user.role !== "DRIVER") {
                // Never downgrade an existing DRIVER to USER automatically.
                user.role = desiredRole;
                changed = true;
            }
            if (desiredRole === "DRIVER" && !user.status) {
                user.status = "PENDING";
                changed = true;
            }
            if (changed)
                await user.save();
            return done(null, user);
        }
        // create new user
        const firstName = profile.name?.givenName || profile.displayName.split(" ")[0];
        const lastName = profile.name?.familyName || profile.displayName.split(" ").slice(1).join(" ");
        const newUser = new user_1.default({
            firstName,
            lastName,
            name: profile.displayName,
            email: googleEmail,
            googleId: profile.id,
            profilePhoto: profile.photos?.[0].value,
            role: desiredRole || "USER",
            status: (desiredRole || "USER") === "DRIVER" ? "PENDING" : "ACTIVE",
        });
        await newUser.save();
        return done(null, newUser);
    }
    catch (err) {
        done(err, undefined);
    }
}));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await user_1.default.findById(id);
        done(null, user);
    }
    catch (err) {
        done(err, undefined);
    }
});
exports.default = passport_1.default;
