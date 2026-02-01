import { io, Socket } from "socket.io-client";

// Socket server URL - will be your Render URL in production
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

console.log("Connecting to Socket.io server:", SOCKET_URL);

let socket: Socket | null = null;
let isInitializing = false;

export const getSocket = (): Socket | null => {
  if (typeof window === "undefined") return null;

  // Return existing socket if it's already connected or connecting
  if (socket && (socket.connected || socket.connecting)) {
    return socket;
  }

  // Prevent multiple initialization attempts
  if (isInitializing) {
    return socket;
  }

  // Create new socket if none exists
  if (!socket) {
    isInitializing = true;
    const token = localStorage.getItem("token");
    if (token) {
      socket = io(SOCKET_URL, {
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
        reconnectionAttempts: 15,
        path: "/socket.io/",
        forceNew: false,
      });

      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket?.id);
        isInitializing = false;
      });

      socket.on("disconnect", (reason) => {
        console.log("⚠️ Socket disconnected:", reason);
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error.message);
      });

      return socket;
    }
    isInitializing = false;
  }
  return null;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
