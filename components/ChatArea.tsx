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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = (message: any) => {
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
        // Don't add duplicate messages
        setMessages((prev) => {
          const exists = prev.some(
            (msg) => msg._id === message.messageId || msg._id === message._id,
          );
          if (exists) return prev;

          return [
            ...prev,
            {
              _id: message.messageId || message._id,
              sender: senderId,
              recipient: recipientId,
              content: message.content,
              timestamp: message.timestamp || new Date().toISOString(),
            },
          ];
        });
        scrollToBottom();
        
        // Play message received sound
        soundManager.playMessageReceived();
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [selectedFriend, currentUser]);

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
      await api.post("chats/get-or-create", {
        otherUserId: selectedFriend.id,
      });
    } catch (e) {
      console.error("Error ensuring chat exists", e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic UI update - add message immediately
    const optimisticMessage: Message = {
      _id: tempId,
      sender: currentUser._id,
      recipient: selectedFriend.id,
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    scrollToBottom();
    
    // Play message sent sound
    soundManager.playMessageSent();

    try {
      // Save to database via API
      const response = await api.post("messages/send", {
        recipientId: selectedFriend.id,
        content: messageContent,
      });

      const savedMessage = response.data;

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
              }
            : msg,
        ),
      );

      // Send real-time notification via Socket.IO
      const socket = getSocket();
      if (socket) {
        socket.emit("send_message", {
          messageId: savedMessage._id,
          senderId: currentUser._id,
          recipientId: selectedFriend.id,
          content: messageContent,
          timestamp: savedMessage.timestamp,
        });
      }
    } catch (error: any) {
      console.error("Failed to send message", error);

      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setNewMessage(messageContent); // Restore message text

      alert(error.response?.data?.message || "Failed to send message");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e5ddd5] min-w-0">
      {/* WhatsApp-style Header */}
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

      {/* Messages Area - WhatsApp style background pattern */}
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
                      <svg
                        width="16"
                        height="11"
                        viewBox="0 0 16 11"
                        fill="none"
                        className="text-gray-500"
                      >
                        <path
                          d="M11.071 0.928L4.293 7.706L1.707 5.121L0.293 6.535L4.293 10.535L12.485 2.343L11.071 0.928Z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp-style Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="bg-[#f0f2f5] px-2 md:px-4 py-2 flex items-center space-x-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
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
