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

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user's personal room
  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // Handle sending messages
  socket.on("send_message", async (data) => {
    try {
      const { messageId, senderId, recipientId, content, timestamp } = data;
      console.log("Message received via socket:", {
        messageId,
        senderId,
        recipientId,
        content,
        timestamp,
      });

      // Save message to database
      const newMessage = new Message({
        _id: messageId,
        senderId,
        recipientId,
        content,
        timestamp: new Date(timestamp),
        isRead: false,
      });

      await newMessage.save();

      // Update or create chat for sender
      await Chat.findOneAndUpdate(
        {
          participants: { $all: [senderId, recipientId] },
        },
        {
          $set: {
            lastMessage: content,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            participants: [senderId, recipientId],
          },
        },
        { upsert: true, new: true },
      );

      // Update or create chat for recipient
      await Chat.findOneAndUpdate(
        {
          participants: { $all: [recipientId, senderId] },
        },
        {
          $set: {
            lastMessage: content,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            participants: [recipientId, senderId],
          },
        },
        { upsert: true, new: true },
      );

      // Emit to recipient's room
      io.to(recipientId).emit("receive_message", {
        _id: messageId,
        senderId,
        recipientId,
        content,
        timestamp,
        isRead: false,
      });

      console.log(`Message ${messageId} sent to user:${recipientId}`);
    } catch (error) {
      console.error("Error handling message:", error);
      socket.emit("message_error", { error: error.message });
    }
  });

  // Handle friend request notifications
  socket.on("friend_request_sent", (data) => {
    const { recipientId, sender } = data;
    io.to(recipientId).emit("new_friend_request", sender);
  });

  socket.on("friend_request_accepted", (data) => {
    const { senderId, acceptor } = data;
    io.to(senderId).emit("friend_request_accepted", acceptor);
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
