import bcrypt from "bcryptjs";
import type { NextFunction } from "express";
import { forgotPassword, resetPassword } from "../../../src/modules/auth/auth.controller";
import User from "../../../src/modules/auth/user.model";
import { sendOTP } from "../../../src/config/mail";

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

jest.mock("../../../src/modules/auth/user.model", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("../../../src/modules/vehicle/vehicle.model", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock("../../../src/modules/payment/transaction.model", () => {
  const ctor: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  ctor.find = jest.fn();
  ctor.deleteMany = jest.fn();
  return {
    __esModule: true,
    default: ctor,
  };
});

jest.mock("../../../src/config/mail", () => ({
  __esModule: true,
  sendOTP: jest.fn(),
  sendBookingConfirmation: jest.fn(),
}));

jest.mock("../../../src/common/utils/token", () => ({
  __esModule: true,
  generateAccessToken: jest.fn(() => "access_token"),
  generateRefreshToken: jest.fn(() => "refresh_token"),
}));

jest.mock("../../../src/modules/notification/notification.controller", () => ({
  __esModule: true,
  createNotification: jest.fn(),
}));

jest.mock("../../../src/config/s3", () => ({
  __esModule: true,
  s3: { send: jest.fn() },
  storage: {},
}));

jest.mock("@aws-sdk/client-s3", () => ({
  __esModule: true,
  GetObjectCommand: jest.fn(),
}));

const mockedUser = User as unknown as { findOne: jest.Mock };
const mockedSendOTP = sendOTP as jest.Mock;
const mockedBcrypt = bcrypt as unknown as { hash: jest.Mock };

const createRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createNext = () => jest.fn() as jest.MockedFunction<NextFunction>;
const getNextError = (next: jest.MockedFunction<NextFunction>) => next.mock.calls[0]?.[0] as unknown as Error;

describe("auth.controller password flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forgotPassword returns 404 for unknown email", async () => {
    mockedUser.findOne.mockResolvedValue(null);

    const req: any = { body: { email: "nobody@example.com" } };
    const res = createRes();
    const next = createNext();

    await forgotPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(getNextError(next).message).toContain("not registered");
  });

  it("forgotPassword returns fallback message when email sending fails", async () => {
    const userDoc = {
      resetPasswordOTP: undefined,
      resetPasswordExpires: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockedUser.findOne.mockResolvedValue(userDoc);
    mockedSendOTP.mockResolvedValue({ success: false, message: "smtp failed" });

    const req: any = { body: { email: "user@example.com" } };
    const res = createRes();
    const next = createNext();

    await forgotPassword(req, res, next);

    expect(userDoc.save).toHaveBeenCalledTimes(1);
    expect(mockedSendOTP).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Real email failed") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("forgotPassword returns success when OTP dispatch succeeds", async () => {
    const userDoc = {
      resetPasswordOTP: undefined,
      resetPasswordExpires: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockedUser.findOne.mockResolvedValue(userDoc);
    mockedSendOTP.mockResolvedValue({ message: "sent" });

    const req: any = { body: { email: "user@example.com" } };
    const res = createRes();
    const next = createNext();

    await forgotPassword(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ message: "OTP sent to email" });
    expect(next).not.toHaveBeenCalled();
  });

  it("resetPassword returns 400 for invalid OTP", async () => {
    mockedUser.findOne.mockResolvedValue(null);

    const req: any = {
      body: { email: "user@example.com", otp: "123456", newPassword: "new-pass" },
    };
    const res = createRes();
    const next = createNext();

    await resetPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(getNextError(next).message).toBe("Invalid or expired OTP");
  });

  it("resetPassword updates hash and clears reset fields", async () => {
    const userDoc: any = {
      password: "old",
      resetPasswordOTP: "123456",
      resetPasswordExpires: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockedUser.findOne.mockResolvedValue(userDoc);
    mockedBcrypt.hash.mockResolvedValue("new_hash");

    const req: any = {
      body: { email: "user@example.com", otp: "123456", newPassword: "new-pass" },
    };
    const res = createRes();
    const next = createNext();

    await resetPassword(req, res, next);

    expect(mockedBcrypt.hash).toHaveBeenCalledWith("new-pass", 10);
    expect(userDoc.password).toBe("new_hash");
    expect(userDoc.resetPasswordOTP).toBeUndefined();
    expect(userDoc.resetPasswordExpires).toBeUndefined();
    expect(userDoc.save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: "Password reset successful" });
    expect(next).not.toHaveBeenCalled();
  });
});
