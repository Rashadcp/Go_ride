import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

// Load env from one directory up (backend folder)
dotenv.config({ path: path.join(__dirname, "../.env") });

async function testEmail() {
    console.log("Starting email diagnostic...");
    console.log(`Using EMAIL_USER: ${process.env.EMAIL_USER}`);

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        console.log("Verifying transporter connection...");
        await transporter.verify();
        console.log("Connection verified successfully!");

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: "GoRide Email Test",
            text: "If you see this, your email configuration is working!",
        });

        console.log("Test email sent successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error: any) {
        console.error("DIAGNOSTIC FAILED:");
        if (error.code === 'EAUTH') {
            console.error("Authentication Error: Your password or username is incorrect.");
            console.error("TIP: For Gmail, you MUST use an 'App Password', not your regular password.");
        } else {
            console.error(error);
        }
    }
}

testEmail();
