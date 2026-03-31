import express from "express";
import request from "supertest";

const protectMock = jest.fn((req, _res, next) => {
  req.user = { id: "admin-1", role: "ADMIN" };
  next();
});
const adminProtectMock = jest.fn((_req, _res, next) => next());

const getDashboardStatsMock = jest.fn((_req, res) =>
  res.status(200).json({ stats: { totalUsers: 10 } })
);
const sendNotificationMock = jest.fn((_req, res) =>
  res.status(200).json({ message: "Notifications sent successfully", targetCount: 2 })
);

jest.mock("../../../src/common/middleware/auth.middleware", () => ({
  __esModule: true,
  protect: protectMock,
  adminProtect: adminProtectMock,
}));

jest.mock("../../../src/modules/admin/admin.controller", () => ({
  __esModule: true,
  getPendingDrivers: jest.fn((_req, res) => res.status(200).json([])),
  approveDriver: jest.fn((_req, res) => res.status(200).json({})),
  getAllDrivers: jest.fn((_req, res) => res.status(200).json([])),
  getDashboardStats: getDashboardStatsMock,
  deleteDriver: jest.fn((_req, res) => res.status(200).json({})),
  getAllUsers: jest.fn((_req, res) => res.status(200).json([])),
  getEmergencyReports: jest.fn((_req, res) => res.status(200).json([])),
  resolveEmergencyReport: jest.fn((_req, res) => res.status(200).json({})),
  getDiscounts: jest.fn((_req, res) => res.status(200).json([])),
  createDiscount: jest.fn((_req, res) => res.status(200).json({})),
  deleteDiscount: jest.fn((_req, res) => res.status(200).json({})),
  getAllTransactions: jest.fn((_req, res) => res.status(200).json([])),
  toggleBlockUser: jest.fn((_req, res) => res.status(200).json({})),
  toggleFlagSuspicious: jest.fn((_req, res) => res.status(200).json({})),
  softDeleteUser: jest.fn((_req, res) => res.status(200).json({})),
  getUserRideHistory: jest.fn((_req, res) => res.status(200).json([])),
  updateUser: jest.fn((_req, res) => res.status(200).json({})),
  sendNotification: sendNotificationMock,
}));

import adminRoutes from "../../../src/modules/admin/admin.routes";

describe("admin.routes", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/admin/stats returns dashboard payload", async () => {
    const response = await request(app).get("/api/admin/stats");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ stats: { totalUsers: 10 } });
    expect(protectMock).toHaveBeenCalled();
    expect(adminProtectMock).toHaveBeenCalled();
    expect(getDashboardStatsMock).toHaveBeenCalled();
  });

  it("POST /api/admin/notifications returns delivery summary", async () => {
    const response = await request(app)
      .post("/api/admin/notifications")
      .send({ targetType: "USERS", title: "System", message: "Hello" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "Notifications sent successfully",
        targetCount: 2,
      })
    );
    expect(sendNotificationMock).toHaveBeenCalled();
  });
});