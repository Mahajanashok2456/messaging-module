const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Middleware to verify token
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      // Token verification can be added here
      return next();
    }
    return next(new Error("Authentication error"));
  });

  const normalizeUserRoom = (userId) =>
    userId && userId.startsWith("user:") ? userId : `user:${userId}`;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join user-specific room for direct messaging
    socket.on("join_user_room", (userId) => {
      const room = normalizeUserRoom(userId);
      socket.join(room);
      console.log(`User ${userId} joined room ${room}`);
    });

    // Handle incoming messages
    socket.on("send_message", async (data) => {
      console.log("Message received via socket:", data);

      // Fetch sender info from database
      let senderName = "Someone";
      try {
        const User = require("./lib/db/User");
        const sender = await User.findById(data.senderId).select("username");
        if (sender) {
          senderName = sender.username;
        }
      } catch (err) {
        console.error("Error fetching sender info:", err);
      }

      // Emit to recipient for real-time delivery
      const recipientRoom = normalizeUserRoom(data.recipientId);
      io.to(recipientRoom).emit("receive_message", {
        messageId: data.messageId,
        _id: data.messageId,
        senderId: data.senderId,
        senderName: senderName,
        recipientId: data.recipientId,
        chatId: data.chatId,
        content: data.content,
        timestamp: data.timestamp,
        status: "delivered",
      });

      // Confirm to sender
      socket.emit("message_sent", {
        messageId: data.messageId,
        status: "sent",
        timestamp: data.timestamp || new Date(),
      });

      console.log(`Message ${data.messageId} sent to ${recipientRoom}`);
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      const recipientRoom = normalizeUserRoom(data.recipientId);
      io.to(recipientRoom).emit("user_typing", {
        userId: data.userId,
        isTyping: data.isTyping,
      });
    });

    // Handle message read receipts
    socket.on("message_read", (data) => {
      const senderRoom = normalizeUserRoom(data.senderId);
      io.to(senderRoom).emit("message_read_receipt", {
        messageId: data.messageId,
        readAt: new Date(),
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      socket.broadcast.emit("user_offline", socket.id);
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
