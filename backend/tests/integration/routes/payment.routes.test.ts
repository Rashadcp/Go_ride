import express from "express";
import request from "supertest";

const protectMock = jest.fn((req, _res, next) => {
  req.user = { id: "u1", role: "USER" };
  next();
});

const createPaymentMock = jest.fn((_req, res) =>
  res.status(201).json({ order: { id: "order_1" }, key_id: "rzp_key" })
);
const verifyPaymentMock = jest.fn((_req, res) =>
  res.status(200).json({ message: "Payment verified successfully", walletBalance: 500 })
);
const getTransactionsMock = jest.fn((_req, res) =>
  res.status(200).json([{ id: "t1", amount: 100, type: "CREDIT" }])
);

jest.mock("../../../src/middleware/auth.middleware", () => ({
  __esModule: true,
  protect: protectMock,
}));

jest.mock("../../../src/modules/payment/payment.controller", () => ({
  __esModule: true,
  createPayment: createPaymentMock,
  verifyPayment: verifyPaymentMock,
  getTransactions: getTransactionsMock,
}));

import paymentRoutes from "../../../src/modules/payment/payment.routes";

describe("payment.routes", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/payment", paymentRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /api/payment/create returns order payload", async () => {
    const response = await request(app)
      .post("/api/payment/create")
      .send({ amount: 100, method: "RAZORPAY" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({ order: expect.objectContaining({ id: "order_1" }) })
    );
    expect(protectMock).toHaveBeenCalled();
    expect(createPaymentMock).toHaveBeenCalled();
  });

  it("POST /api/payment/verify returns verification payload", async () => {
    const response = await request(app)
      .post("/api/payment/verify")
      .send({ razorpay_order_id: "o1", razorpay_payment_id: "p1", razorpay_signature: "sig" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ message: "Payment verified successfully", walletBalance: 500 })
    );
    expect(verifyPaymentMock).toHaveBeenCalled();
  });

  it("GET /api/payment/transactions returns transaction list shape", async () => {
    const response = await request(app).get("/api/payment/transactions");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(
      expect.objectContaining({ id: "t1", amount: 100, type: "CREDIT" })
    );
    expect(getTransactionsMock).toHaveBeenCalled();
  });
});