"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppConfirmation = void 0;
const twilio_1 = __importDefault(require("twilio"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const client = (0, twilio_1.default)(accountSid, authToken);
const sendWhatsAppConfirmation = async (phoneNumber, rideDetails) => {
    console.log(`[WhatsApp Attempt] Recipient: ${phoneNumber}, Ride: ${rideDetails.rideId}`);
    // Ensure the phone number is in E.164 format and starts with 'whatsapp:'
    let formattedPhone = phoneNumber.startsWith("+") ? "whatsapp:" + phoneNumber : "whatsapp:+" + phoneNumber;
    // Basic cleaning (remove spaces if any)
    formattedPhone = formattedPhone.replace(/\s+/g, '');
    const isMockMode = !accountSid || !authToken || !whatsappNumber;
    if (isMockMode) {
        console.log("-----------------------------------------");
        console.log(`[DEV MODE] WhatsApp message not sent - Missing credentials`);
        console.log(`Formatted Phone: ${formattedPhone}`);
        console.log(`ACCOUNT_SID: ${accountSid ? 'SET' : 'MISSING'}`);
        console.log(`AUTH_TOKEN: ${authToken ? 'SET' : 'MISSING'}`);
        console.log(`WHATSAPP_NUMBER: ${whatsappNumber ? 'SET' : 'MISSING'}`);
        console.log("-----------------------------------------");
        return { success: false, message: "Mock WhatsApp (Missing Creds)" };
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
        console.log(`[WhatsApp API Call] To: ${formattedPhone} From: ${whatsappNumber}`);
        const message = await client.messages.create({
            from: whatsappNumber,
            to: formattedPhone,
            body: messageBody,
        });
        console.log(`[WhatsApp SUCCESS] SID: ${message.sid}`);
        return message;
    }
    catch (error) {
        console.error("[WhatsApp FAILURE] Error details:", error.message || error);
        return { success: false, message: error.message || "WhatsApp failed" };
    }
};
exports.sendWhatsAppConfirmation = sendWhatsAppConfirmation;
