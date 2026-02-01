// Standalone Socket.io server for Render
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Message = require("./lib/db/Message");
const Chat = require("./lib/db/Chat");

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

connectDB();

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

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user's personal room (for receiving messages on all devices)
  socket.on("join_user_room", (userId) => {
    const room = normalizeUserRoom(userId);
    socket.join(room);
    console.log(
      `User ${userId} joined personal room ${room} (socket: ${socket.id})`,
    );
  });

  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // Handle sending messages
  socket.on("send_message", async (data, callback) => {
    try {
      const { messageId, chatId, senderId, recipientId, content, timestamp } = data;

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

      console.log("Message broadcast via socket:", {
        messageId,
        senderId,
        recipientId,
        content,
        timestamp,
      });

      // Fetch sender info from database
      let senderName = "Someone";
      try {
        const User = require("./lib/db/User");
        const sender = await User.findById(senderId).select("username");
        if (sender) {
          senderName = sender.username;
        }
      } catch (err) {
        console.error("Error fetching sender info:", err);
      }

      const messageTimestamp = timestamp || new Date().toISOString();
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

      // Message is already saved by API - just broadcast it IMMEDIATELY
      const recipientRoom = normalizeUserRoom(recipientId);
      const senderRoom = normalizeUserRoom(senderId);

      // Emit to recipient's room (all their devices) - INSTANT
      io.to(recipientRoom).emit("receive_message", messagePayload);
      console.log(`📤 Message sent to recipient room ${recipientRoom}`);

      // Also emit to sender's other devices (except the sending one) - INSTANT
      socket.to(senderRoom).emit("receive_message", messagePayload);
      console.log(`📤 Message sent to sender's other devices (${senderRoom})`);

      // Send immediate acknowledgment back to sender - NO DELAY
      if (callback) {
        callback({
          success: true,
          messageId: messageId,
          status: "delivered",
          timestamp: messageTimestamp,
        });
      }

      console.log(`✅ Message ${messageId} delivered instantly to all devices`);
    } catch (error) {
      console.error("Error handling send_message broadcast:", error);
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

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});
