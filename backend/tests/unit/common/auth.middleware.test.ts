import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../../../src/models/user";
import { adminProtect, protect } from "../../../src/common/middleware/auth.middleware";

jest.mock("../../../src/models/user", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));

const mockedUser = User as unknown as { findById: jest.Mock };
const mockedJwt = jwt as unknown as { verify: jest.Mock };

const createRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe("common/middleware/auth.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no token is provided", async () => {
    const req = { headers: {} } as any;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    mockedJwt.verify.mockImplementation(() => {
      throw new Error("bad token");
    });

    const req = { headers: { authorization: "Bearer invalid" } } as any;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Token is invalid" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not found", async () => {
    mockedJwt.verify.mockReturnValue({ id: "u1" });
    mockedUser.findById.mockResolvedValue(null);

    const req = { headers: { authorization: "Bearer valid" } } as any;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user is blocked", async () => {
    mockedJwt.verify.mockReturnValue({ id: "u1" });
    mockedUser.findById.mockResolvedValue({ isBlocked: true, isDeleted: false });

    const req = { headers: { authorization: "Bearer valid" } } as any;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Your account has been blocked by an administrator.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user is soft deleted", async () => {
    mockedJwt.verify.mockReturnValue({ id: "u1" });
    mockedUser.findById.mockResolvedValue({ isBlocked: false, isDeleted: true });

    const req = { headers: { authorization: "Bearer valid" } } as any;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "This account has been deleted." });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches user and calls next for valid token", async () => {
    const dbUser = { _id: "u1", role: "USER", isBlocked: false, isDeleted: false };
    mockedJwt.verify.mockReturnValue({ id: "u1" });
    mockedUser.findById.mockResolvedValue(dbUser);

    const req = { headers: { authorization: "Bearer valid" } } as any;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    await protect(req, res, next);

    expect(req.user).toBe(dbUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("adminProtect allows only ADMIN users", () => {
    const okReq = { user: { role: "ADMIN" } } as any;
    const badReq = { user: { role: "USER" } } as any;
    const res = createRes();
    const next = jest.fn() as NextFunction;

    adminProtect(okReq, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    adminProtect(badReq, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied: Admins only" });
  });
});
