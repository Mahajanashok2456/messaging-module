import { io, Socket } from "socket.io-client";

const getSocketUrl = () => {
  if (typeof window === "undefined") return null;

  return process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || window.location.origin;
};

let socket: Socket | null = null;
let isInitializing = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

export const getSocket = (): Socket | null => {
  if (typeof window === "undefined") return null;

  // Return existing socket if it's already connected
  if (socket && socket.connected) {
    return socket;
  }

  // Return existing socket even if initializing (let it finish connecting)
  if (socket && isInitializing) {
    return socket;
  }

  // Prevent multiple initialization attempts
  if (isInitializing) {
    return socket;
  }

  // Create new socket if none exists
  if (!socket) {
    isInitializing = true;
    connectionAttempts++;

    const SOCKET_URL = getSocketUrl();
    if (!SOCKET_URL) {
      isInitializing = false;
      return null;
    }

    console.log(
      `🔌 Initializing socket connection (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`,
    );

    console.log("🔌 Connecting to Socket.io server:", SOCKET_URL);

    socket = io(SOCKET_URL, {
      // Critical: Must match server path configuration
      path: "/socket.io/",

      // Transport configuration - prefer WebSocket for instant delivery
      transports: ["websocket"],

      // Credentials for CORS
      withCredentials: true,

      // Reconnection settings
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,

      // Connection timeout
      timeout: 10000,

      // Don't force new connection on each call
      forceNew: false,

      // WebSocket only
      upgrade: false,
      rememberUpgrade: false,
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket?.id);
      console.log("📡 Transport:", socket?.io.engine.transport.name);
      isInitializing = false;
      connectionAttempts = 0;

      // Auto-join user room on connect/reconnect
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          socket?.emit("join_user_room", user._id);
          console.log("🔄 Auto-joined user room:", user._id);
        } catch (e) {
          console.error("❌ Failed to parse user data", e);
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("⚠️ Socket disconnected:", reason);

      // If the server closed the connection, we'll reconnect automatically
      if (reason === "io server disconnect") {
        console.log("🔄 Server disconnected - will reconnect automatically");
      }
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      console.error("   Error details:", error);

      // Log transport info for debugging
      if (socket?.io.engine) {
        console.error("   Current transport:", socket.io.engine.transport.name);
      }

      // Check if it's a CORS error
      if (error.message.includes("CORS") || error.message.includes("cross")) {
        console.error(
          "   ⚠️ CORS error detected - check server CORS configuration",
        );
      }

      // Check if it's a WebSocket upgrade failure
      if (
        error.message.includes("WebSocket") ||
        error.message.includes("upgrade")
      ) {
        console.error(
          "   ⚠️ WebSocket upgrade failed - will fallback to polling",
        );
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Failed to reconnect to socket server");
    });

    socket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error.message);
    });

    return socket;
  }
  return null;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log("🔌 Disconnecting socket...");
    socket.disconnect();
    socket = null;
    isInitializing = false;
    connectionAttempts = 0;
  }
};

// Helper function to check if socket is connected
export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};

// Helper function to get socket ID
export const getSocketId = (): string | undefined => {
  return socket?.id;
};
