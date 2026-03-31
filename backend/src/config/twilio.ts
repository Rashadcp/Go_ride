import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

const client = twilio(accountSid, authToken);

export const sendWhatsAppConfirmation = async (phoneNumber: string, rideDetails: any) => {
  // Ensure the phone number is in E.164 format and starts with 'whatsapp:'
  let formattedPhone = phoneNumber.startsWith("+") ? "whatsapp:" + phoneNumber : "whatsapp:+" + phoneNumber;
  
  // Basic cleaning (remove spaces if any)
  formattedPhone = formattedPhone.replace(/\s+/g, '');

  const isMockMode = !accountSid || !authToken || !whatsappNumber;

  if (isMockMode) {
    console.log("-----------------------------------------");
    console.log(`[DEV MODE] WhatsApp Confirmation for ${formattedPhone}`);
    console.log(`Ride ID: ${rideDetails.rideId}`);
    console.log(`From: ${rideDetails.pickup}`);
    console.log(`To: ${rideDetails.destination}`);
    console.log(`Fare: ₹${rideDetails.fare}`);
    console.log("-----------------------------------------");
    return { message: "Mock WhatsApp sent" };
  }

  const messageBody = `
🚗 *GoRide Booking Confirmed!*

Your ride has been successfully booked.

🆔 *Ride ID:* ${rideDetails.rideId}
📍 *Pickup:* ${rideDetails.pickup}
🏁 *Destination:* ${rideDetails.destination}
💰 *Estimated Fare:* ₹${rideDetails.fare}

👨‍✈️ *Captain:* ${rideDetails.driverName}
🚗 *Vehicle:* ${rideDetails.vehicleInfo || 'Premium Ride'}

Have a safe journey with GoRide!
  `.trim();

  try {
    const message = await client.messages.create({
      from: whatsappNumber,
      to: formattedPhone,
      body: messageBody,
    });
    console.log(`WhatsApp message sent successfully: ${message.sid}`);
    return message;
  } catch (error: any) {
    console.error("Failed to send WhatsApp message. Error details:", error);
    return { success: false, message: error.message || "WhatsApp failed" };
  }
};
