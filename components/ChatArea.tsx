"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Send } from "lucide-react";

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
}

export default function ChatArea({ selectedFriend, currentUser }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages();
      joinChat();
    }
  }, [selectedFriend]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      // Check if message belongs to current chat
      const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
      const recipientId = typeof message.recipient === 'string' ? message.recipient : message.recipient._id;
      
      if (
        (senderId === selectedFriend.id && recipientId === currentUser._id) ||
        (senderId === currentUser._id && recipientId === selectedFriend.id)
      ) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
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
      const response = await api.get(`/api/messages/history/${selectedFriend.id}`);
      setMessages(response.data);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to fetch messages", error);
    } finally {
      setLoading(false);
    }
  };

  const joinChat = async () => {
    // Ideally get chat ID from backend or just rely on user room
    // The backend joins user room automatically.
    // But we can also create a chat session if needed.
    try {
       await api.post("/api/chats/get-or-create", { recipientId: selectedFriend.id });
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

    const socket = getSocket();
    if (socket) {
      // Send via Socket.IO
      socket.emit("send_message", {
        recipientId: selectedFriend.id,
        content: newMessage,
        tempMessageId: Date.now().toString(), // For optimistic updates if needed
      });
      
      // We listen to receive_message for self-messages too in this backend impl?
      // Backend: io.to(user:recipientId).emit... AND io.to(user:senderId).emit...
      // Yes, backend emits to sender too.
      setNewMessage("");
    } else {
      console.error("Socket not connected");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">{selectedFriend.username}</h3>
        <span className="text-xs text-gray-500">{selectedFriend.email}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="text-center text-gray-500 mt-10">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">No messages yet. Say hi!</div>
        ) : (
          messages.map((msg, index) => {
             const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender._id;
             const isMe = senderId === currentUser._id;
             return (
              <div
                key={msg._id || index}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-indigo-200" : "text-gray-400"}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
