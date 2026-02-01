import { NextResponse } from "next/server";
import { createClient } from "redis";

const rateLimitMap = new Map();
let redisClient = null;
let redisReady = false;

const getRedisClient = async () => {
  if (redisClient) return redisClient;

  if (!process.env.REDIS_URL) return null;

  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on("error", () => {
    redisReady = false;
  });
  redisClient.on("ready", () => {
    redisReady = true;
  });

  await redisClient.connect();
  return redisClient;
};

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
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip =
      forwardedFor?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const now = Date.now();

    // Prefer Redis for multi-instance deployments
    const client = await getRedisClient();
    if (client && redisReady) {
      const key = `rate:${ip}:${Math.floor(now / windowMs)}`;
      const current = await client.incr(key);
      if (current === 1) {
        await client.pexpire(key, windowMs);
      }

      if (current > limit) {
        return NextResponse.json(
          {
            message: "Too many requests, please try again later",
            retryAfter: Math.ceil(windowMs / 1000),
          },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) },
          },
        );
      }

      return null;
    }

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
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((data.windowStart + windowMs - now) / 1000),
            ),
          },
        },
      );
    }

    // Increment counter
    data.count++;
    data.requests.push(now);
    rateLimitMap.set(ip, data);

    return null; // Continue to next handler
  };
}
