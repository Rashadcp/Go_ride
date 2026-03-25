import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/user";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5001/api/auth/google/callback",
      passReqToCallback: true,
    },
    async (req: any, accessToken, refreshToken, profile, done) => {
      try {
        const desiredRoleRaw = typeof req?.query?.state === "string" ? req.query.state : undefined;
        const desiredRole = desiredRoleRaw === "DRIVER" || desiredRoleRaw === "USER" ? desiredRoleRaw : undefined;

        console.log(`🔍 Google Auth callback triggered. Desired Role: ${desiredRole || 'none'}`);

        const googleEmail = profile.emails?.[0].value.toLowerCase();

        // try find existing user by googleId or email
        let user = await User.findOne({ googleId: profile.id });
        if (!user && googleEmail) {
          user = await User.findOne({ email: googleEmail });
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
          if (changed) await user.save();
          return done(null, user);
        }

        // create new user
        const firstName = profile.name?.givenName || profile.displayName.split(" ")[0];
        const lastName = profile.name?.familyName || profile.displayName.split(" ").slice(1).join(" ");

        const newUser = new User({
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
      } catch (err) {
        done(err as any, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err as any, undefined);
  }
});

export default passport;
