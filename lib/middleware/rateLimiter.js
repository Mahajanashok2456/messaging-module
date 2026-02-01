import { NextResponse } from "next/server";

const rateLimitMap = new Map();

// Clean up old entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
      if (data.windowStart + 15 * 60 * 1000 < now) {
        rateLimitMap.delete(ip);
      }
    }
  },
  5 * 60 * 1000,
); // Cleanup every 5 minutes

export function rateLimit(limit = 100, windowMs = 15 * 60 * 1000) {
  return async (req) => {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const now = Date.now();

    const data = rateLimitMap.get(ip) || {
      count: 0,
      windowStart: now,
      requests: [],
    };

    // Reset window if expired
    if (data.windowStart + windowMs < now) {
      data.count = 0;
      data.windowStart = now;
      data.requests = [];
    }

    // Check if limit exceeded
    if (data.count >= limit) {
      return NextResponse.json(
        {
          message: "Too many requests, please try again later",
          retryAfter: Math.ceil((data.windowStart + windowMs - now) / 1000),
        },
        { status: 429 },
      );
    }

    // Increment counter
    data.count++;
    data.requests.push(now);
    rateLimitMap.set(ip, data);

    return null; // Continue to next handler
  };
}
