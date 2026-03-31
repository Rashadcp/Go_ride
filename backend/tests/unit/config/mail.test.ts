const sendMailMock = jest.fn();

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}));

describe("config/mail", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.EMAIL_USER = "";
    process.env.EMAIL_PASS = "";
  });

  it("sendOTP returns mock response when SMTP credentials are missing", async () => {
    const mailModule = await import("../../../src/config/mail");

    const result = await mailModule.sendOTP("user@example.com", "123456");

    expect(result).toEqual({ message: "Mock email sent" });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("sendOTP sends email when credentials exist", async () => {
    process.env.EMAIL_USER = "smtp-user@example.com";
    process.env.EMAIL_PASS = "smtp-pass";
    sendMailMock.mockResolvedValue({ messageId: "m123" });

    const mailModule = await import("../../../src/config/mail");

    const result = await mailModule.sendOTP("user@example.com", "654321");

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "GoRide - Password Reset OTP",
      })
    );
    expect(result).toEqual({ messageId: "m123" });
  });

  it("sendOTP returns graceful failure response when SMTP call throws", async () => {
    process.env.EMAIL_USER = "smtp-user@example.com";
    process.env.EMAIL_PASS = "smtp-pass";
    sendMailMock.mockRejectedValue(new Error("smtp down"));

    const mailModule = await import("../../../src/config/mail");

    const result = await mailModule.sendOTP("user@example.com", "654321");

    expect(result).toEqual({ success: false, message: "smtp down" });
  });
});
