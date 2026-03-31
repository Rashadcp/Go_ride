import crypto from "crypto";
import { createPayment, verifyPayment } from "../../../src/modules/payment/payment.controller";
import Ride from "../../../src/models/ride";
import Transaction from "../../../src/models/transaction";
import User from "../../../src/models/user";
import { createNotification } from "../../../src/modules/notification/notification.controller";

var razorpayOrderCreateMock: jest.Mock;

jest.mock("razorpay", () => {
  razorpayOrderCreateMock = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      orders: { create: razorpayOrderCreateMock },
    })),
  };
});

jest.mock("../../../src/models/ride", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("../../../src/models/transaction", () => {
  const ctor: any = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  ctor.findOne = jest.fn();
  return {
    __esModule: true,
    default: ctor,
  };
});

jest.mock("../../../src/models/user", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../../../src/modules/notification/notification.controller", () => ({
  __esModule: true,
  createNotification: jest.fn(),
}));

const mockedRide = Ride as unknown as { findOne: jest.Mock; findById: jest.Mock };
const mockedTransaction = Transaction as unknown as jest.Mock & { findOne: jest.Mock };
const mockedUser = User as unknown as { findById: jest.Mock };
const mockedCreateNotification = createNotification as jest.Mock;

const createRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("payment.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
  });

  it("createPayment returns 400 for invalid amount", async () => {
    const req: any = { body: { amount: 0 }, user: { id: "u1" } };
    const res = createRes();

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Please provide a valid payment amount." });
  });

  it("createPayment creates Razorpay order for wallet top-up", async () => {
    razorpayOrderCreateMock.mockResolvedValue({ id: "order_123", amount: 10000 });

    const req: any = { body: { amount: 100, method: "RAZORPAY" }, user: { id: "u1" } };
    const res = createRes();

    await createPayment(req, res);

    expect(razorpayOrderCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10000, currency: "INR" })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({ id: "order_123" }),
        paymentContext: expect.objectContaining({ purpose: "WALLET_TOPUP", amount: 100 }),
      })
    );
  });

  it("createPayment returns 404 when ride payment target is not found", async () => {
    mockedRide.findOne.mockResolvedValue(null);
    mockedRide.findById.mockResolvedValue(null);

    const req: any = {
      body: { amount: 50, method: "RAZORPAY", rideId: "ride_404" },
      user: { id: "u1" },
    };
    const res = createRes();

    await createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Ride not found for payment." });
  });

  it("verifyPayment returns 400 when signature is invalid", async () => {
    const req: any = {
      body: {
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "wrong_sig",
        amount: 100,
      },
      user: { id: "u1" },
    };
    const res = createRes();

    await verifyPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Signature verification failed" });
  });

  it("verifyPayment credits wallet and creates transaction for top-up", async () => {
    const body = "order_1|pay_1";
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(body)
      .digest("hex");

    const userDoc = {
      _id: "u1",
      walletBalance: 10,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockedUser.findById.mockResolvedValue(userDoc);

    const req: any = {
      body: {
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: signature,
        amount: 90,
      },
      user: { id: "u1" },
    };
    const res = createRes();

    await verifyPayment(req, res);

    expect(userDoc.walletBalance).toBe(100);
    expect(userDoc.save).toHaveBeenCalledTimes(1);
    expect(mockedTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", amount: 90, type: "CREDIT", method: "ONLINE" })
    );
    const createdTx = mockedTransaction.mock.results[0]?.value;
    expect(createdTx.save).toHaveBeenCalled();
    expect(mockedCreateNotification).toHaveBeenCalledWith(
      "u1",
      "Wallet Topped Up",
      expect.stringContaining("90"),
      "PAYMENT"
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Payment verified successfully",
        walletBalance: 100,
        type: "TOPUP",
      })
    );
  });
});
