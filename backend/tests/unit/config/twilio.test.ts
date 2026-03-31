const messageCreateMock = jest.fn();
const twilioFactoryMock = jest.fn(() => ({
  messages: {
    create: messageCreateMock,
  },
}));

jest.mock("twilio", () => ({
  __esModule: true,
  default: twilioFactoryMock,
}));

describe("config/twilio", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = "";
    process.env.TWILIO_AUTH_TOKEN = "";
    process.env.TWILIO_WHATSAPP_NUMBER = "";
  });

  it("returns mock response when Twilio creds are missing", async () => {
    const twilioModule = await import("../../../src/config/twilio");

    const result = await twilioModule.sendWhatsAppConfirmation("9876543210", {
      rideId: "RIDE-1",
      pickup: "A",
      destination: "B",
      fare: 100,
      driverName: "Driver",
    });

    expect(result).toEqual({ success: false, message: "Mock WhatsApp (Missing Creds)" });
    expect(messageCreateMock).not.toHaveBeenCalled();
  });

  it("sends WhatsApp message when creds are present", async () => {
    process.env.TWILIO_ACCOUNT_SID = "sid";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_WHATSAPP_NUMBER = "whatsapp:+12345678901";
    messageCreateMock.mockResolvedValue({ sid: "msg_1" });

    const twilioModule = await import("../../../src/config/twilio");

    const result = await twilioModule.sendWhatsAppConfirmation("9876543210", {
      rideId: "RIDE-1",
      pickup: "A",
      destination: "B",
      fare: 100,
      driverName: "Driver",
      vehicleInfo: "Sedan",
    });

    expect(messageCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "whatsapp:+12345678901",
        to: "whatsapp:+9876543210",
      })
    );
    expect(result).toEqual({ sid: "msg_1" });
  });

  it("returns graceful error response when Twilio API fails", async () => {
    process.env.TWILIO_ACCOUNT_SID = "sid";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_WHATSAPP_NUMBER = "whatsapp:+12345678901";
    messageCreateMock.mockRejectedValue(new Error("twilio down"));

    const twilioModule = await import("../../../src/config/twilio");

    const result = await twilioModule.sendWhatsAppConfirmation("+919876543210", {
      rideId: "RIDE-1",
      pickup: "A",
      destination: "B",
      fare: 100,
      driverName: "Driver",
    });

    expect(result).toEqual({ success: false, message: "twilio down" });
  });
});
