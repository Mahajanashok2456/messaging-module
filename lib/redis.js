/**
 * Redis Client Setup for Online User Tracking
 *
 * Redis is used for:
 * 1. Fast O(1) online user lookups
 * 2. Storing userId -> socketId mappings
 * 3. Tracking presence without DB overhead
 */

const redis = require("redis");

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
async function connectRedis() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    // Create Redis client
    // For production: Use REDIS_URL from environment (Render, Railway, etc.)
    // For development: Use local Redis or upstash.com free tier
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("❌ Redis max reconnection attempts reached");
            return new Error("Redis reconnection failed");
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // Error handling
    redisClient.on("error", (err) => {
      console.error("❌ Redis Client Error:", err);
      isConnected = false;
    });

    redisClient.on("connect", () => {
      console.log("🔄 Redis connecting...");
    });

    redisClient.on("ready", () => {
      console.log("✅ Redis connected and ready");
      isConnected = true;
    });

    redisClient.on("reconnecting", () => {
      console.log("⚠️ Redis reconnecting...");
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error("❌ Redis connection failed:", error.message);
    console.log("⚠️ Falling back to in-memory user tracking");
    // Application continues without Redis - uses fallback Map
    return null;
  }
}

/**
 * Mark user as online and store socketId mapping
 * @param {string} userId - User ID
 * @param {string} socketId - Socket connection ID
 */
async function setUserOnline(userId, socketId) {
  try {
    if (!redisClient || !isConnected) return false;

    // Store userId -> socketId mapping with 24h expiration
    await redisClient.setEx(`online:${userId}`, 86400, socketId);
    console.log(`✅ User ${userId} marked online in Redis`);
    return true;
  } catch (error) {
    console.error("❌ Redis setUserOnline error:", error);
    return false;
  }
}

/**
 * Check if user is online and get their socketId
 * @param {string} userId - User ID to check
 * @returns {string|null} socketId if online, null if offline
 */
async function getUserSocketId(userId) {
  try {
    if (!redisClient || !isConnected) return null;

    const socketId = await redisClient.get(`online:${userId}`);
    return socketId;
  } catch (error) {
    console.error("❌ Redis getUserSocketId error:", error);
    return null;
  }
}

/**
 * Mark user as offline and remove from Redis
 * @param {string} userId - User ID
 */
async function setUserOffline(userId) {
  try {
    if (!redisClient || !isConnected) return false;

    await redisClient.del(`online:${userId}`);
    console.log(`✅ User ${userId} marked offline in Redis`);
    return true;
  } catch (error) {
    console.error("❌ Redis setUserOffline error:", error);
    return false;
  }
}

/**
 * Get all online user IDs
 * @returns {Array<string>} Array of online user IDs
 */
async function getAllOnlineUsers() {
  try {
    if (!redisClient || !isConnected) return [];

    const keys = await redisClient.keys("online:*");
    return keys.map((key) => key.replace("online:", ""));
  } catch (error) {
    console.error("❌ Redis getAllOnlineUsers error:", error);
    return [];
  }
}

/**
 * Close Redis connection gracefully
 */
async function disconnectRedis() {
  try {
    if (redisClient && isConnected) {
      await redisClient.quit();
      console.log("✅ Redis connection closed");
    }
  } catch (error) {
    console.error("❌ Redis disconnect error:", error);
  }
}

module.exports = {
  connectRedis,
  setUserOnline,
  getUserSocketId,
  setUserOffline,
  getAllOnlineUsers,
  disconnectRedis,
  getClient: () => redisClient,
};
