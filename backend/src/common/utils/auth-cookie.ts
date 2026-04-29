import { Request, Response } from "express";

const REFRESH_COOKIE_NAME = "goride_refresh_token";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const parseBoolean = (value?: string) => {
  if (!value) return undefined;
  return value.toLowerCase() === "true";
};

const getCookieSameSite = (): "lax" | "strict" | "none" => {
  const configuredValue = (process.env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase();

  if (configuredValue === "strict" || configuredValue === "none") {
    return configuredValue;
  }

  return "lax";
};

const getCookieSecure = () => {
  const explicitSecure = parseBoolean(process.env.AUTH_COOKIE_SECURE);
  if (explicitSecure !== undefined) {
    return explicitSecure;
  }

  return getCookieSameSite() === "none" || process.env.NODE_ENV === "production";
};

const parseCookieHeader = (cookieHeader?: string) => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, cookiePart) => {
    const separatorIndex = cookiePart.indexOf("=");
    if (separatorIndex === -1) {
      return acc;
    }

    const key = cookiePart.slice(0, separatorIndex).trim();
    const value = cookiePart.slice(separatorIndex + 1).trim();

    if (!key) {
      return acc;
    }

    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
};

export const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: getCookieSecure(),
    sameSite: getCookieSameSite(),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: "/",
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: getCookieSecure(),
    sameSite: getCookieSameSite(),
    path: "/",
  });
};

export const getRefreshTokenFromRequest = (req: Request) => {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[REFRESH_COOKIE_NAME] || null;
};
