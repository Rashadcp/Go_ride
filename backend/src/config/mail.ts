import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const sesRegion = process.env.AWS_REGION || "eu-north-1";

const transporter = nodemailer.createTransport({
  host: `email-smtp.${sesRegion}.amazonaws.com`,
  port: 465,
  secure: true,
  auth: {
    user: process.env.AWS_SES_SMTP_USER,
    pass: process.env.AWS_SES_SMTP_PASS,
  },
});

export const sendOTP = async (email: string, otp: string) => {
  // Check if credentials are missing
  const isMockMode = !process.env.AWS_SES_SMTP_USER || !process.env.AWS_SES_SMTP_PASS;

  if (isMockMode) {
    console.log("-----------------------------------------");
    console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
    console.log("-----------------------------------------");
    return { message: "Mock email sent" };
  }

  console.log(`Attempting to send real email to ${email}...`);

  const mailOptions = {
    from: `"GoRide" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "GoRide - Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #10b981; text-align: center;">GoRide Password Reset</h2>
        <p>Hello,</p>
        <p>You requested to reset your password. Use the following OTP to proceed:</p>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #064e3b; border-radius: 8px;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">&copy; 2026 GoRide Platforms Inc.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Failed to send real email. Error details:", error);
    console.log("-----------------------------------------");
    console.log(`[FALLBACK] OTP for ${email}: ${otp}`);
    console.log("-----------------------------------------");
    return { success: false, message: "Email failed, logged to console" };
  }
};
