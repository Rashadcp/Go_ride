import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import User from "./src/models/user";

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log("✅ Connected to MongoDB");

        const adminEmail = "admin@goride.com";
        const adminPassword = "adminpassword123";

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log("⚠️ Admin user already exists. Updating role to ADMIN...");
            existingAdmin.role = "ADMIN";
            await existingAdmin.save();
            console.log("✅ Admin updated successfully!");
        } else {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const newAdmin = new User({
                firstName: "System",
                lastName: "Admin",
                name: "System Admin",
                email: adminEmail,
                password: hashedPassword,
                role: "ADMIN",
                status: "ACTIVE"
            });

            await newAdmin.save();
            console.log("🚀 Admin user created successfully!");
            console.log("📧 Email:", adminEmail);
            console.log("🔑 Password:", adminPassword);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error creating admin:", error);
    }
};

createAdmin();
