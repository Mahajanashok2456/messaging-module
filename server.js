const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Build CORS origins list from environment variables
  const corsOrigins = [
    "http://localhost:3000",
    "http://localhost:5000",
    process.env.SOCKET_CORS_ORIGIN,
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  console.log("🔧 Socket.IO CORS Origins:", corsOrigins);

  const io = new Server(server, {
    // Critical: Use explicit path to avoid conflicts
    path: "/socket.io/",

    // CORS configuration - must match frontend origin
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    },
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      const isAllowed = origin && corsOrigins.includes(origin);
      callback(null, Boolean(isAllowed));
    },

    // Transport configuration - WebSocket only for low-latency
    transports: ["websocket"],
    allowUpgrades: false,
    serveClient: false,

    // Connection settings
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL_MS || "25000", 10),
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT_MS || "20000", 10),

    // Upgrade settings for WebSocket
    upgradeTimeout: 10000,

    // Buffer size for large messages
    maxHttpBufferSize: 1e6, // 1MB

    // Connection state recovery
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  // Log Socket.IO server configuration
  console.log("🔧 Socket.IO Server Configuration:");
  console.log("  - Path:", io.path());
  console.log("  - Transports:", io.opts.transports);
  console.log("  - CORS Origins:", corsOrigins);
  console.log("  - Ping Interval:", io.opts.pingInterval + "ms");
  console.log("  - Ping Timeout:", io.opts.pingTimeout + "ms");

  const parseCookies = (cookieHeader = "") => {
    return cookieHeader.split(";").reduce((acc, part) => {
      const [key, ...rest] = part.trim().split("=");
      if (!key) return acc;
      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
  };

  const setupRedisAdapter = async () => {
    if (!process.env.REDIS_URL) {
      console.log("⚠️ REDIS_URL not set - using in-memory adapter");
      return;
    }

    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      pubClient.on("error", (err) =>
        console.error("❌ Redis adapter error:", err),
      );
      subClient.on("error", (err) =>
        console.error("❌ Redis adapter error:", err),
      );

      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.io Redis adapter enabled");
    } catch (error) {
      console.error("❌ Failed to enable Redis adapter:", error);
    }
  };

  setupRedisAdapter().catch((error) => {
    console.error("❌ Failed to enable Redis adapter:", error);
  });

  // Middleware to verify token
  io.use((socket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const cookieToken = cookies.accessToken;
    const headerToken = socket.handshake.auth?.token;
    const token = cookieToken || headerToken;

    if (!token) {
      console.log("❌ Socket authentication failed: No token provided");
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: "mess-app",
        audience: "mess-app-users",
      });
      socket.data.userId = decoded.userId;
      console.log(`✅ Socket authenticated for user: ${decoded.userId}`);
      return next();
    } catch (error) {
      console.log(
        "❌ Socket authentication failed: Invalid token",
        error.message,
      );
      return next(new Error("Authentication error"));
    }
  });

  const normalizeUserRoom = (userId) =>
    userId && userId.startsWith("user:") ? userId : `user:${userId}`;

  // Log connection events
  io.engine.on("connection_error", (err) => {
    console.error("❌ Socket.IO connection error:", err);
  });

  io.on("connection", (socket) => {
    console.log(
      "✅ User connected:",
      socket.id,
      "User ID:",
      socket.data.userId,
    );

    // Join user-specific room for direct messaging
    const userRoom = normalizeUserRoom(socket.data.userId);
    socket.join(userRoom);
    console.log(`📥 User ${socket.data.userId} auto-joined room ${userRoom}`);

    socket.on("join_user_room", () => {
      // No-op: room join is enforced server-side
    });

    // Handle incoming messages
    socket.on("send_message", async (data) => {
      console.log("📨 Message received via socket:", data);

      // Fetch sender info from database
      let senderName = "Someone";
      try {
        const User = require("./lib/db/User");
        const sender = await User.findById(data.senderId).select("username");
        if (sender) {
          senderName = sender.username;
        }
      } catch (err) {
        console.error("❌ Error fetching sender info:", err);
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

      console.log(`✅ Message ${data.messageId} sent to ${recipientRoom}`);
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
    socket.on("disconnect", (reason) => {
      console.log("⚠️ User disconnected:", socket.id, "Reason:", reason);
      socket.broadcast.emit("user_offline", socket.id);
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO endpoint: http://localhost:${PORT}/socket.io/`);
  });
});
