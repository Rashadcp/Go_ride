import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (email: string, otp: string) => {
  // Check if credentials are missing
  const isMockMode = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;

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
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #111827; text-align: center; margin-bottom: 24px; font-weight: 800;">Go<span style="color: #fbbf24;">Ride</span> Verification</h2>
        <p style="color: #374151;">Hello,</p>
        <p style="color: #374151;">You requested to reset your password. Use the following OTP to proceed:</p>
        <div style="background: #111827; padding: 20px; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 12px; color: #fbbf24; border-radius: 8px; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">&copy; 2026 GoRide Platforms Inc.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error: any) {
    console.error("Failed to send real email. Error details:", error);
    console.log("-----------------------------------------");
    console.log(`[FALLBACK] OTP for ${email}: ${otp}`);
    console.log("-----------------------------------------");
    return { success: false, message: error.message || "Email failed" };
  }
};

export const sendBookingConfirmation = async (userEmail: string, rideDetails: any) => {
  const isMockMode = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;

  if (isMockMode) {
    console.log("-----------------------------------------");
    console.log(`[DEV MODE] Booking Confirmation for ${userEmail}`);
    console.log(`Ride ID: ${rideDetails.rideId}`);
    console.log(`From: ${rideDetails.pickup}`);
    console.log(`To: ${rideDetails.destination}`);
    console.log(`Fare: ₹${rideDetails.fare}`);
    console.log("-----------------------------------------");
    return { message: "Mock booking email sent" };
  }

  const mailOptions = {
    from: `"GoRide" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `GoRide - Booking Confirmed! (${rideDetails.rideId})`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 15px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 25px;">
           <h1 style="color: #111827; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">Go<span style="color: #fbbf24;">Ride</span></h1>
           <p style="color: #111827; font-weight: 700; margin-top: 5px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Booking Confirmed</p>
        </div>
        
        <div style="background: #111827; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <h3 style="margin-top: 0; color: #fbbf24; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Ride Summary</h3>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <p style="margin: 4px 0; color: #9ca3af; font-size: 13px;">Ride ID: <span style="font-family: monospace; color: #ffffff;">${rideDetails.rideId}</span></p>
            <p style="margin: 8px 0 0 0; color: #ffffff; font-weight: 300;">Estimated Fare</p>
            <p style="margin: 0; color: #fbbf24; font-weight: 900; font-size: 28px;">₹${rideDetails.fare}</p>
          </div>
        </div>

        <div style="margin-bottom: 25px; padding: 10px;">
           <div style="position: relative; padding-left: 30px; margin-bottom: 20px;">
              <div style="position: absolute; left: 8px; top: 12px; bottom: -15px; width: 2px; border-left: 2px dotted #fbbf24;"></div>
              <div style="position: absolute; left: 0; top: 0; width: 14px; height: 14px; border-radius: 50%; background: #fbbf24; border: 3px solid #ffffff; box-shadow: 0 0 0 2px #fbbf24;"></div>
              <p style="margin: 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Pickup</p>
              <p style="margin: 4px 0 0 0; color: #111827; font-weight: 600; font-size: 15px;">${rideDetails.pickup}</p>
           </div>
           
           <div style="position: relative; padding-left: 30px;">
              <div style="position: absolute; left: 0; top: 0; width: 14px; height: 14px; border-radius: 50%; background: #111827; border: 3px solid #ffffff; box-shadow: 0 0 0 2px #111827;"></div>
              <p style="margin: 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Destination</p>
              <p style="margin: 4px 0 0 0; color: #111827; font-weight: 600; font-size: 15px;">${rideDetails.destination}</p>
           </div>
        </div>

        <div style="border-top: 1px solid #f3f4f6; padding-top: 25px; margin-bottom: 25px;">
           <h3 style="margin-top: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">Your Captain</h3>
           <div style="display: flex; align-items: center; background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #f3f4f6;">
              <div style="flex-grow: 1;">
                 <p style="margin: 0; font-weight: 800; color: #111827; font-size: 17px;">${rideDetails.driverName}</p>
                 <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 13px; font-weight: 500; background: #fbbf24; display: inline-block; padding: 2px 8px; border-radius: 4px;">${rideDetails.vehicleInfo || 'Premium Ride'}</p>
              </div>
           </div>
        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 12px; background: #f9fafb; padding: 20px; border-radius: 12px;">
          <p style="margin-top: 0;">Have a safe journey with GoRide!</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
          <p style="margin-bottom: 0;">&copy; 2026 GoRide Platforms Inc. | All Rights Reserved</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation email sent: ${info.messageId}`);
    return info;
  } catch (error: any) {
    console.error("Failed to send booking email. Error details:", error);
    return { success: false, message: error.message || "Email failed" };
  }
};
