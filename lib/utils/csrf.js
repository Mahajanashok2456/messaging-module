import crypto from "crypto";
import { NextResponse } from "next/server";

const getCookieSameSite = () => {
  const value = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  if (value === "none" || value === "strict" || value === "lax") {
    return value;
  }
  return "lax";
};

export const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

export const setCsrfCookie = (response, token) => {
  response.cookies.set("csrfToken", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: getCookieSameSite(),
    path: "/",
    maxAge: 60 * 60 * 24,
  });
};

export const verifyCsrf = (req) => {
  const headerToken = req.headers.get("x-csrf-token");
  const cookieToken = req.cookies?.get("csrfToken")?.value;

  if (!headerToken || !cookieToken) return false;
  return headerToken === cookieToken;
};

export const requireCsrf = (req) => {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { message: "Invalid CSRF token" },
      { status: 403 },
    );
  }
  return null;
};
