"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Send, ArrowLeft } from "lucide-react";
import { soundManager } from "@/lib/utils/soundManager";

interface Friend {
  id: string;
  username: string;
  email: string;
}

interface Message {
  _id: string;
  sender: { _id: string; username: string } | string;
  recipient: { _id: string; username: string } | string;
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  readAt?: string;
}

interface ChatAreaProps {
  selectedFriend: Friend;
  currentUser: any;
  onBack?: () => void;
}

export default function ChatArea({
  selectedFriend,
  currentUser,
  onBack,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages();
      joinChat();
      joinUserRoom();

      // Set up periodic sync every 30 seconds to catch messages from other devices
      const syncInterval = setInterval(async () => {
        try {
          const response = await api.get(
            `messages/history/${selectedFriend.id}`,
          );
          const newMessages = response.data.messages || response.data || [];

          // Only update if there are new messages
          setMessages((prev) => {
            const prevIds = new Set(prev.map((m) => m._id));
            const hasNew = newMessages.some((m: any) => !prevIds.has(m._id));

            if (hasNew) {
              console.log("Syncing messages from other devices...");
              return newMessages;
            }
            return prev;
          });
        } catch (error) {
          console.error("Failed to sync messages", error);
        }
      }, 30000); // Sync every 30 seconds

      return () => clearInterval(syncInterval);
    }
  }, [selectedFriend]);

  // Monitor socket connection status
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.warn("Socket not available");
      return;
    }

    const handleSocketConnect = () => {
      console.log("Socket reconnected, rejoining rooms...");
      joinUserRoom();
    };

    const handleSocketDisconnect = () => {
      console.log("Socket disconnected, will attempt to reconnect");
    };

    socket.on("connect", handleSocketConnect);
    socket.on("disconnect", handleSocketDisconnect);

    return () => {
      socket.off("connect", handleSocketConnect);
      socket.off("disconnect", handleSocketDisconnect);
    };
  }, [currentUser]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark received messages as read
  useEffect(() => {
    const markMessagesAsRead = async () => {
      // Only mark received messages (where currentUser is recipient) as read
      const unreadMessages = messages.filter((msg) => {
        const recipientId =
          typeof msg.recipient === "string" ? msg.recipient : msg.recipient._id;
        return recipientId === currentUser._id && msg.status !== "read";
      });

      if (unreadMessages.length > 0) {
        try {
          await api.put("messages/mark-read", {
            messageIds: unreadMessages.map((m) => m._id),
          });

          // Update local message status
          setMessages((prev) =>
            prev.map((msg) =>
              unreadMessages.some((um) => um._id === msg._id)
                ? { ...msg, status: "read", readAt: new Date().toISOString() }
                : msg,
            ),
          );

          // Emit read receipt via socket
          const socket = getSocket();
          if (socket && chatId) {
            socket.emit("mark_read", {
              messageIds: unreadMessages.map((m) => m._id),
              readBy: currentUser._id,
            });
            
            // Emit messages_read event to update unread count in Sidebar
            socket.emit("messages_read", {
              chatId: chatId,
            });
          }
        } catch (error) {
          console.error("Failed to mark messages as read", error);
        }
      }
    };

    const timer = setTimeout(() => {
      markMessagesAsRead();
    }, 500); // Delay to avoid marking as read immediately

    return () => clearTimeout(timer);
  }, [messages, currentUser._id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = (message: any) => {
      console.log("Received message via socket:", message);

      // Check if message belongs to current chat
      const senderId =
        message.senderId ||
        (typeof message.sender === "string"
          ? message.sender
          : message.sender?._id);
      const recipientId =
        message.recipientId ||
        (typeof message.recipient === "string"
          ? message.recipient
          : message.recipient?._id);

      // Add message if it's for the current chat (either direction)
      if (
        (senderId === selectedFriend.id && recipientId === currentUser._id) ||
        (senderId === currentUser._id && recipientId === selectedFriend.id)
      ) {
        console.log("Message matches current chat, adding to list");

        // Don't add duplicate messages
        setMessages((prev) => {
          const messageId = message.messageId || message._id;
          const exists = prev.some((msg) => msg._id === messageId);
          if (exists) {
            console.log("Message already exists, skipping duplicate");
            return prev;
          }

          const newMsg: Message = {
            _id: messageId,
            sender:
              typeof message.sender === "string"
                ? { _id: senderId, username: "" }
                : message.sender || senderId,
            recipient:
              typeof message.recipient === "string"
                ? { _id: recipientId, username: "" }
                : message.recipient || recipientId,
            content: message.content,
            timestamp: message.timestamp || new Date().toISOString(),
            status: message.status || "delivered",
          };

          return [...prev, newMsg];
        });
        scrollToBottom();

        // Play message received sound
        soundManager.playMessageReceived();
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    // Handle read receipts
    const handleMessagesRead = (data: any) => {
      const { messageIds, readBy } = data;

      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg._id)
            ? { ...msg, status: "read", readAt: new Date().toISOString() }
            : msg,
        ),
      );

      console.log(`Messages read by ${readBy}:`, messageIds);
    };

    socket.on("messages_read", handleMessagesRead);

    // Handle typing indicators
    const handleTypingIndicator = (data: any) => {
      const { userId, isTyping: typing } = data;
      if (userId === selectedFriend.id) {
        setIsTyping(typing);

        // Auto-hide typing indicator after 3 seconds
        if (typing) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        }
      }
    };

    socket.on("user_typing", handleTypingIndicator);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("messages_read", handleMessagesRead);
      socket.off("user_typing", handleTypingIndicator);

      // Clear typing timeout on cleanup
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [selectedFriend.id, currentUser._id]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.get(`messages/history/${selectedFriend.id}`);
      setMessages(response.data.messages || response.data || []);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to fetch messages", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const joinUserRoom = () => {
    const socket = getSocket();
    if (socket && currentUser) {
      socket.emit("join_user_room", currentUser._id);
    }
  };

  const joinChat = async () => {
    // Create or get chat session
    try {
      const response = await api.post("chats/get-or-create", {
        otherUserId: selectedFriend.id,
      });
      if (response.data && response.data.chatId) {
        setChatId(response.data.chatId);
      }
    } catch (e) {
      console.error("Error ensuring chat exists", e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    const socket = getSocket();
    if (!socket || !socket.connected) return;

    // Emit typing indicator
    socket.emit("typing", {
      userId: currentUser._id,
      recipientId: selectedFriend.id,
      isTyping: value.length > 0,
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 1 second of inactivity
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", {
          userId: currentUser._id,
          recipientId: selectedFriend.id,
          isTyping: false,
        });
      }, 1000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Stop typing indicator
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("typing", {
        userId: currentUser._id,
        recipientId: selectedFriend.id,
        isTyping: false,
      });
    }

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic UI update - add message immediately - ZERO DELAY
    const optimisticMessage: Message = {
      _id: tempId,
      sender: currentUser._id,
      recipient: selectedFriend.id,
      content: messageContent,
      timestamp: new Date().toISOString(),
      status: "sent",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    scrollToBottom();

    // Play message sent sound immediately
    soundManager.playMessageSent();

    try {
      // Save to database via API - PARALLEL execution
      const apiPromise = api.post("messages/send", {
        recipientId: selectedFriend.id,
        content: messageContent,
      });

      // Get socket and emit IMMEDIATELY without waiting for API
      const socket = getSocket();
      let socketEmitted = false;

      if (socket && socket.connected) {
        socketEmitted = true;
        console.log("🚀 Emitting message via socket INSTANTLY (no wait):", {
          messageId: tempId,
          senderId: currentUser._id,
          recipientId: selectedFriend.id,
          content: messageContent,
          timestamp: new Date().toISOString(),
        });

        // Emit with callback for acknowledgment
        socket.emit(
          "send_message",
          {
            messageId: tempId,
            senderId: currentUser._id,
            recipientId: selectedFriend.id,
            content: messageContent,
            timestamp: new Date().toISOString(),
          },
          (response: any) => {
            if (response?.success) {
              console.log("✅ Socket acknowledged message delivery");
            }
          },
        );
      }

      // Now wait for API response to get real message ID
      const response = await apiPromise;
      const savedMessage = response.data;
      console.log("💾 Message saved to database:", savedMessage._id);

      // Update the temporary message with real data from server
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId
            ? {
                _id: savedMessage._id,
                sender: savedMessage.sender,
                recipient: savedMessage.recipient,
                content: savedMessage.content,
                timestamp: savedMessage.timestamp,
                status: socketEmitted ? "delivered" : "sent",
              }
            : msg,
        ),
      );

      // If socket wasn't available before, send now with real ID
      if (!socketEmitted) {
        const socket = getSocket();
        if (socket && socket.connected) {
          console.log("Emitting send_message via socket with real ID:", {
            messageId: savedMessage._id,
            senderId: currentUser._id,
            recipientId: selectedFriend.id,
            content: messageContent,
            timestamp: savedMessage.timestamp,
          });

          socket.emit("send_message", {
            messageId: savedMessage._id,
            senderId: currentUser._id,
            recipientId: selectedFriend.id,
            content: messageContent,
            timestamp: savedMessage.timestamp,
          });
        } else {
          console.warn("Socket not available, message sent via API only");
        }
      }
    } catch (error: any) {
      console.error("❌ Failed to send message", error);

      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setNewMessage(messageContent); // Restore message text

      alert(error.response?.data?.message || "Failed to send message");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e5ddd5] min-w-0">
      {/* Lets chat-style Header */}
      <div className="bg-[#f0f2f5] border-b border-gray-300 flex items-center px-3 md:px-4 py-2 md:py-3 shadow-sm">
        {/* Back button - visible on mobile only */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden mr-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
            title="Go back"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
        )}

        <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold mr-2 md:mr-3 flex-shrink-0">
          {selectedFriend.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-medium text-gray-900 truncate">
            {selectedFriend.username}
          </h3>
          <span className="text-xs text-gray-500 hidden sm:inline">
            tap here for contact info
          </span>
        </div>
      </div>

      {/* Messages Area - Lets chat style background pattern */}
      <div
        className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {loading ? (
          <div className="text-center text-gray-500 mt-10">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map((msg, index) => {
            const senderId =
              typeof msg.sender === "string" ? msg.sender : msg.sender._id;
            const isMe = senderId === currentUser._id;
            return (
              <div
                key={msg._id || index}
                className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}
              >
                <div
                  className={`max-w-[calc(100vw-2rem)] sm:max-w-xs md:max-w-md px-3 py-2 rounded-lg shadow-md relative text-sm md:text-base ${
                    isMe
                      ? "bg-[#dcf8c6] text-gray-900"
                      : "bg-white text-gray-900"
                  }`}
                  style={{
                    borderRadius: isMe
                      ? "7.5px 7.5px 0px 7.5px"
                      : "7.5px 7.5px 7.5px 0px",
                  }}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className="text-[11px] text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && (
                      <div className="flex items-center">
                        {/* Single or Double Tick */}
                        <svg
                          width="16"
                          height="11"
                          viewBox="0 0 16 11"
                          fill="none"
                          className={`${
                            msg.status === "read"
                              ? "text-blue-500"
                              : "text-gray-500"
                          }`}
                        >
                          <path
                            d="M11.071 0.928L4.293 7.706L1.707 5.121L0.293 6.535L4.293 10.535L12.485 2.343L11.071 0.928Z"
                            fill="currentColor"
                          />
                        </svg>
                        {/* Second Tick for Delivered/Read */}
                        {(msg.status === "delivered" ||
                          msg.status === "read") && (
                          <svg
                            width="16"
                            height="11"
                            viewBox="0 0 16 11"
                            fill="none"
                            className={`-ml-2 ${
                              msg.status === "read"
                                ? "text-blue-500"
                                : "text-gray-500"
                            }`}
                          >
                            <path
                              d="M11.071 0.928L4.293 7.706L1.707 5.121L0.293 6.535L4.293 10.535L12.485 2.343L11.071 0.928Z"
                              fill="currentColor"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-white px-4 py-2 rounded-lg shadow-md">
              <div className="flex items-center space-x-1">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Lets chat-style Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="bg-[#f0f2f5] px-2 md:px-4 py-2 flex items-center space-x-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Type a message"
          className="flex-1 bg-white border border-gray-300 rounded-full px-3 md:px-4 py-2 text-xs md:text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-[#25D366] text-white rounded-full p-2 md:p-2.5 hover:bg-[#128C7E] disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-md flex-shrink-0"
        >
          <Send size={16} className="md:w-5 md:h-5" />
        </button>
      </form>
    </div>
  );
}
