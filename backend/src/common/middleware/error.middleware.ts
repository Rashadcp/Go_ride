import { NextFunction, Request, Response } from "express";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new Error(`Route not found: ${req.originalUrl}`) as Error & {
    status?: number;
  };
  error.status = 404;
  next(error);
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Global Error Context:", {
    method: req.method,
    url: req.url,
    error: err.message || err,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  res.status(err.status || res.statusCode || 500).json({
    message: err.message || "An unexpected error occurred on the server.",
    error: process.env.NODE_ENV === "development" ? err : undefined,
  });
};
