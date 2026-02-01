// Standalone Socket.io server for Render
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
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

// CORS configuration for Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      process.env.FRONTEND_URL || "*", // Your Vercel URL
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

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
    })
      .populate("sender", "username")
      .sort({ timestamp: 1 }); // Oldest first

    if (pendingMessages.length > 0) {
      console.log(
        `📨 Delivering ${pendingMessages.length} pending messages to ${userId}`,
      );

      for (const msg of pendingMessages) {
        // Emit message to user's socket
        const userRoom = normalizeUserRoom(userId);

        const messagePayload = {
          _id: msg._id,
          messageId: msg._id,
          senderId: msg.sender._id,
          senderName: msg.sender.username,
          recipientId: msg.recipient,
          recipient: msg.recipient,
          content: msg.content,
          timestamp: msg.timestamp,
          status: "delivered",
        };

        io.to(userRoom).emit("receive_message", messagePayload);

        // Update message status to "delivered"
        msg.status = "delivered";
        await msg.save();
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

  // Join user's personal room (for receiving messages on all devices)
  socket.on("join_user_room", async (userId) => {
    const room = normalizeUserRoom(userId);
    socket.join(room);
    currentUserId = userId; // Store for disconnect handler

    console.log(
      `User ${userId} joined personal room ${room} (socket: ${socket.id})`,
    );

    // ============================================
    // PRESENCE TRACKING: Mark user as ONLINE
    // ============================================
    await markUserOnline(userId, socket.id);

    // ============================================
    // OFFLINE MESSAGE DELIVERY: Send pending messages
    // ============================================
    await deliverPendingMessages(userId, socket);

    // Broadcast to user's friends that they're online
    try {
      const user = await User.findById(userId).populate("friends", "_id");
      if (user && user.friends) {
        user.friends.forEach((friend) => {
          const friendRoom = normalizeUserRoom(friend._id);
          io.to(friendRoom).emit("user_online", {
            userId,
            timestamp: new Date().toISOString(),
          });
        });
      }
    } catch (error) {
      console.error("Error broadcasting online status:", error);
    }
  });

  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

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

      // ============================================
      // STEP 1: MESSAGE IS ALREADY SAVED IN DB BY API
      // (with status="sent")
      // ============================================

      // Fetch sender info from database
      let senderName = "Someone";
      try {
        const sender = await User.findById(senderId).select("username");
        if (sender) {
          senderName = sender.username;
        }
      } catch (err) {
        console.error("Error fetching sender info:", err);
      }

      const messageTimestamp = timestamp || new Date().toISOString();

      // ============================================
      // STEP 2: CHECK IF RECEIVER IS ONLINE (Redis check)
      // ============================================
      const isReceiverOnline = await isUserOnline(recipientId);

      let finalStatus = "sent"; // Default status

      if (isReceiverOnline) {
        // ============================================
        // RECEIVER IS ONLINE: Deliver immediately
        // ============================================
        console.log(
          `✅ Receiver ${recipientId} is ONLINE - delivering instantly`,
        );

        const messagePayload = {
          _id: messageId,
          messageId: messageId,
          senderId,
          sender: senderId,
          senderName: senderName,
          recipientId,
          recipient: recipientId,
          chatId,
          content,
          timestamp: messageTimestamp,
          status: "delivered",
        };

        // Emit to recipient's room (all their devices)
        const recipientRoom = normalizeUserRoom(recipientId);
        io.to(recipientRoom).emit("receive_message", messagePayload);
        console.log(`📤 Message sent to recipient room ${recipientRoom}`);

        // Also emit to sender's other devices (except the sending one)
        const senderRoom = normalizeUserRoom(senderId);
        socket.to(senderRoom).emit("receive_message", messagePayload);
        console.log(
          `📤 Message sent to sender's other devices (${senderRoom})`,
        );

        // Update message status in DB to "delivered"
        try {
          await Message.findByIdAndUpdate(messageId, {
            status: "delivered",
          });
          finalStatus = "delivered";
          console.log(`✅ Message ${messageId} marked as DELIVERED in DB`);
        } catch (dbError) {
          console.error("Error updating message status:", dbError);
        }
      } else {
        // ============================================
        // RECEIVER IS OFFLINE: Keep message pending
        // ============================================
        console.log(
          `⏸️ Receiver ${recipientId} is OFFLINE - message stays PENDING`,
        );
        console.log(`📬 Message will be delivered when user comes online`);

        // Optional: Trigger push notification here
        // await sendPushNotification(recipientId, senderName, content);

        finalStatus = "sent"; // Message stays in "sent" state
      }

      // Send acknowledgment back to sender
      if (callback) {
        callback({
          success: true,
          messageId: messageId,
          status: finalStatus,
          timestamp: messageTimestamp,
          receiverOnline: isReceiverOnline,
        });
      }

      console.log(
        `✅ Message ${messageId} processing complete - Status: ${finalStatus}`,
      );
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
