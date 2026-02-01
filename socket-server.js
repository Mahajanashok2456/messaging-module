// Standalone Socket.io server for Render
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const Message = require("./lib/db/Message");
const Chat = require("./lib/db/Chat");
const User = require("./lib/db/User");
const {
  connectRedis,
  setUserOnline,
  getUserSocketId,
  setUserOffline,
  disconnectRedis,
} = require("./lib/redis");

const app = express();
const server = http.createServer(app);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS configuration for Socket.io
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    const isAllowed = origin && allowedOrigins.includes(origin);
    callback(null, Boolean(isAllowed));
  },
  transports: ["websocket"],
  allowUpgrades: false,
  serveClient: false,
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL_MS || "25000", 10),
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT_MS || "20000", 10),
  maxHttpBufferSize: 1e6,
});

const ACK_TIMEOUT_MS = parseInt(
  process.env.SOCKET_ACK_TIMEOUT_MS || "5000",
  10,
);
const RETRY_INTERVAL_MS = parseInt(
  process.env.MESSAGE_RETRY_INTERVAL_MS || "15000",
  10,
);
const RETRY_MAX_ATTEMPTS = parseInt(
  process.env.MESSAGE_RETRY_MAX_ATTEMPTS || "8",
  10,
);

const parseCookies = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const verifySocketToken = (socket) => {
  const cookies = parseCookies(socket.handshake.headers.cookie || "");
  const cookieToken = cookies.accessToken;
  const headerToken = socket.handshake.auth?.token;
  const token = cookieToken || headerToken;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "mess-app",
      audience: "mess-app-users",
    });
    return decoded.userId;
  } catch (error) {
    return null;
  }
};

const setupRedisAdapter = async () => {
  if (!process.env.REDIS_URL) return;

  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("❌ Redis adapter error:", err));
  subClient.on("error", (err) => console.error("❌ Redis adapter error:", err));

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));
  console.log("✅ Socket.io Redis adapter enabled");
};

// In-memory fallback if Redis unavailable
const onlineUsersMap = new Map(); // userId -> socketId

// Connect to MongoDB
let isConnected = false;

async function connectDB() {
  if (isConnected) {
    console.log("Using existing MongoDB connection");
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB Connected:", db.connection.host);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
}

// Initialize connections
(async () => {
  await connectDB();
  await connectRedis();
  await setupRedisAdapter();
})();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mongodb: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Socket.io server is running",
    connections: io.engine.clientsCount,
  });
});

const normalizeUserRoom = (userId) =>
  userId && userId.startsWith("user:") ? userId : `user:${userId}`;

const calculateRetryDelay = (attempts) => {
  const base = 2000;
  const max = 60 * 1000;
  return Math.min(base * Math.pow(2, attempts), max);
};

const emitWithAck = async ({ recipientRoom, payload, messageId, attempt }) => {
  try {
    const acked = await new Promise((resolve) => {
      io.to(recipientRoom)
        .timeout(ACK_TIMEOUT_MS)
        .emit("receive_message", payload, (error, responses) => {
          resolve(!error && Array.isArray(responses) && responses.length > 0);
        });
    });

    if (acked) {
      await Message.findOneAndUpdate(
        { messageId },
        {
          $set: {
            status: "delivered",
            lastDeliveryAttemptAt: new Date(),
          },
          $inc: { deliveryAttempts: 1 },
        },
      );
      return true;
    }
  } catch (error) {
    console.warn(`⚠️ ACK timeout for message ${messageId}`, error.message);
  }

  await Message.findOneAndUpdate(
    { messageId },
    {
      $set: {
        status: "sent",
        lastDeliveryAttemptAt: new Date(),
        nextRetryAt: new Date(Date.now() + calculateRetryDelay(attempt)),
      },
      $inc: { deliveryAttempts: 1 },
    },
  );

  return false;
};

io.use((socket, next) => {
  const userId = verifySocketToken(socket);
  if (!userId) {
    return next(new Error("Authentication error"));
  }
  socket.data.userId = userId;
  return next();
});

/**
 * HELPER: Mark user as online in both Redis and MongoDB
 */
async function markUserOnline(userId, socketId) {
  try {
    // Try Redis first (fast O(1) lookup)
    const redisSuccess = await setUserOnline(userId, socketId);

    // Always update MongoDB for persistence
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Fallback to in-memory if Redis failed
    if (!redisSuccess) {
      onlineUsersMap.set(userId, socketId);
    }

    console.log(`👤 User ${userId} is now ONLINE`);
  } catch (error) {
    console.error("Error marking user online:", error);
  }
}

/**
 * HELPER: Mark user as offline in both Redis and MongoDB
 */
async function markUserOffline(userId) {
  try {
    // Try Redis first
    const redisSuccess = await setUserOffline(userId);

    // Always update MongoDB
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
    });

    // Fallback to in-memory if Redis failed
    if (!redisSuccess) {
      onlineUsersMap.delete(userId);
    }

    console.log(`👤 User ${userId} is now OFFLINE`);
  } catch (error) {
    console.error("Error marking user offline:", error);
  }
}

/**
 * HELPER: Check if user is online using Redis (with fallback)
 */
async function isUserOnline(userId) {
  try {
    // Try Redis first (fastest)
    const socketId = await getUserSocketId(userId);
    if (socketId) return true;

    // Fallback to in-memory Map
    if (onlineUsersMap.has(userId)) return true;

    return false;
  } catch (error) {
    console.error("Error checking user online status:", error);
    return false;
  }
}

/**
 * HELPER: Deliver pending messages to user who just came online
 */
async function deliverPendingMessages(userId, socket) {
  try {
    console.log(`📬 Checking pending messages for user ${userId}...`);

    // Find all messages where:
    // - User is the recipient
    // - Status is still "sent" (not delivered yet)
    const pendingMessages = await Message.find({
      recipient: userId,
      status: "sent",
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: new Date() } }],
    })
      .populate("sender", "username")
      .sort({ timestamp: 1 }); // Oldest first

    if (pendingMessages.length > 0) {
      console.log(
        `📨 Delivering ${pendingMessages.length} pending messages to ${userId}`,
      );

      for (const msg of pendingMessages) {
        const userRoom = normalizeUserRoom(userId);

        const messagePayload = {
          _id: msg._id,
          messageId: msg.messageId,
          senderId: msg.sender._id,
          senderName: msg.sender.username,
          recipientId: msg.recipient,
          recipient: msg.recipient,
          content: msg.content,
          timestamp: msg.timestamp,
          status: "sent",
        };

        await emitWithAck({
          recipientRoom: userRoom,
          payload: messagePayload,
          messageId: msg.messageId,
          attempt: msg.deliveryAttempts + 1,
        });
      }

      console.log(
        `✅ Successfully delivered ${pendingMessages.length} pending messages`,
      );
    } else {
      console.log(`✅ No pending messages for user ${userId}`);
    }
  } catch (error) {
    console.error("Error delivering pending messages:", error);
  }
}

// Socket.io connection handling
io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  let currentUserId = null; // Track user for this socket

  const authenticatedUserId = socket.data.userId;
  const userRoom = normalizeUserRoom(authenticatedUserId);
  socket.join(userRoom);
  currentUserId = authenticatedUserId;
  console.log(
    `User ${authenticatedUserId} auto-joined personal room ${userRoom} (socket: ${socket.id})`,
  );

  // Join user's personal room (for receiving messages on all devices)
  socket.on("join_user_room", async () => {
    // No-op: room join is enforced server-side
  });

  // Presence and offline delivery
  (async () => {
    await markUserOnline(authenticatedUserId, socket.id);
    await deliverPendingMessages(authenticatedUserId, socket);

    try {
      const user = await User.findById(authenticatedUserId).populate(
        "friends",
        "_id",
      );
      if (user && user.friends) {
        user.friends.forEach((friend) => {
          const friendRoom = normalizeUserRoom(friend._id);
          io.to(friendRoom).emit("user_online", {
            userId: authenticatedUserId,
            timestamp: new Date().toISOString(),
          });
        });
      }
    } catch (error) {
      console.error("Error broadcasting online status:", error);
    }
  })();

  // Handle sending messages
  socket.on("send_message", async (data, callback) => {
    try {
      const { messageId, chatId, senderId, recipientId, content, timestamp } =
        data;

      // Validate required fields
      if (!messageId || !senderId || !recipientId || !content) {
        console.error("Missing required fields:", {
          messageId,
          senderId,
          recipientId,
          content,
        });
        if (callback) callback({ error: "Missing required fields" });
        return;
      }

      console.log("📤 Processing message:", {
        messageId,
        senderId,
        recipientId,
      });

      if (socket.data.userId && senderId !== socket.data.userId) {
        if (callback) callback({ error: "Sender mismatch" });
        return;
      }
      const messageTimestamp = timestamp || new Date();
      const senderName = data.senderName || "Someone";

      const messagePayload = {
        _id: messageId,
        messageId,
        senderId,
        sender: senderId,
        senderName,
        recipientId,
        recipient: recipientId,
        chatId,
        content,
        timestamp: messageTimestamp,
        status: "sent",
      };

      // Emit immediately (non-blocking)
      const recipientRoom = normalizeUserRoom(recipientId);
      io.to(recipientRoom).emit("receive_message", messagePayload);

      const senderRoom = normalizeUserRoom(senderId);
      socket.to(senderRoom).emit("receive_message", messagePayload);

      if (callback) {
        callback({
          success: true,
          messageId,
          status: "sent",
          timestamp: messageTimestamp,
        });
      }

      // Persist + delivery bookkeeping asynchronously
      setImmediate(async () => {
        try {
          let dbMessage = await Message.findOne({ messageId });

          if (!dbMessage) {
            dbMessage = new Message({
              sender: senderId,
              recipient: recipientId,
              content,
              messageId,
            });
            await dbMessage.save();
          }

          // Attempt ACK-based delivery without blocking the event loop
          await emitWithAck({
            recipientRoom,
            payload: {
              ...messagePayload,
              _id: dbMessage._id,
              timestamp: dbMessage.timestamp || messageTimestamp,
            },
            messageId,
            attempt: dbMessage.deliveryAttempts + 1,
          });
        } catch (error) {
          console.error("Error in async message persistence:", error);
        }
      });
    } catch (error) {
      console.error("Error handling send_message:", error);
      if (callback) callback({ error: error.message });
      socket.emit("message_error", { error: error.message });
    }
  });

  // Handle marking messages as read
  socket.on("mark_read", (data) => {
    try {
      const { messageIds, readBy } = data;

      // Broadcast read receipts to the sender's room (other devices + original sender)
      const readerRoom = normalizeUserRoom(readBy);
      io.to(readerRoom).emit("messages_read", {
        messageIds,
        readBy,
        timestamp: new Date().toISOString(),
      });

      console.log(`Messages marked as read by user: ${readBy}`);
    } catch (error) {
      console.error("Error handling mark_read:", error);
    }
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    try {
      const { userId, recipientId, isTyping } = data;
      const recipientRoom = normalizeUserRoom(recipientId);

      // Broadcast typing status to recipient
      io.to(recipientRoom).emit("user_typing", {
        userId,
        isTyping,
      });

      console.log(
        `User ${userId} typing status: ${isTyping} to ${recipientRoom}`,
      );
    } catch (error) {
      console.error("Error handling typing indicator:", error);
    }
  });

  // Handle friend request notifications
  socket.on("friend_request_sent", (data) => {
    const { recipientId, sender } = data;
    const recipientRoom = normalizeUserRoom(recipientId);
    io.to(recipientRoom).emit("new_friend_request", sender);
  });

  socket.on("friend_request_accepted", (data) => {
    const { senderId, acceptor } = data;
    const senderRoom = normalizeUserRoom(senderId);
    io.to(senderRoom).emit("friend_request_accepted", acceptor);
  });

  // ============================================
  // DISCONNECT: Mark user as OFFLINE
  // ============================================
  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    if (currentUserId) {
      // Mark user as offline in Redis and MongoDB
      await markUserOffline(currentUserId);

      // Broadcast to user's friends that they're offline
      try {
        const user = await User.findById(currentUserId).populate(
          "friends",
          "_id",
        );
        if (user && user.friends) {
          user.friends.forEach((friend) => {
            const friendRoom = normalizeUserRoom(friend._id);
            io.to(friendRoom).emit("user_offline", {
              userId: currentUserId,
              lastSeen: new Date().toISOString(),
            });
          });
        }
      } catch (error) {
        console.error("Error broadcasting offline status:", error);
      }
    }
  });
});

const retryPendingMessages = async () => {
  try {
    const now = new Date();
    const pending = await Message.find({
      status: "sent",
      deliveryAttempts: { $lt: RETRY_MAX_ATTEMPTS },
      nextRetryAt: { $lte: now },
    })
      .populate("sender", "username")
      .limit(200);

    for (const msg of pending) {
      const recipientId = msg.recipient.toString();
      const recipientRoom = normalizeUserRoom(recipientId);
      const isOnline = await isUserOnline(recipientId);

      if (!isOnline) continue;

      const payload = {
        _id: msg._id,
        messageId: msg.messageId,
        senderId: msg.sender._id,
        senderName: msg.sender.username,
        recipientId,
        recipient: recipientId,
        content: msg.content,
        timestamp: msg.timestamp,
        status: "sent",
      };

      await emitWithAck({
        recipientRoom,
        payload,
        messageId: msg.messageId,
        attempt: msg.deliveryAttempts + 1,
      });
    }
  } catch (error) {
    console.error("Error retrying pending messages:", error);
  }
};

setInterval(retryPendingMessages, RETRY_INTERVAL_MS);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(async () => {
    console.log("HTTP server closed");

    // Close Redis connection
    await disconnectRedis();

    // Close MongoDB connection
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing server");
  await disconnectRedis();
  mongoose.connection.close(false, () => {
    console.log("Connections closed");
    process.exit(0);
  });
});
