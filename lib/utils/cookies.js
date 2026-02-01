export const getCookieSameSite = () => {
  const value = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  if (value === "none" || value === "strict" || value === "lax") {
    return value;
  }
  return "lax";
};

export const getCookieOptions = (overrides = {}) => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: getCookieSameSite(),
    path: "/",
    ...overrides,
  };
};
