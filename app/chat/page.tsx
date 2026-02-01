"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import { getSocket, disconnectSocket } from "@/lib/socket";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Load user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Initialize socket
    const socket = getSocket();
    if (socket) {
      // You can add global socket listeners here if needed
    }

    setIsLoading(false);

    return () => {
      disconnectSocket();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden flex-col md:flex-row">
      {/* Sidebar - Hidden on mobile when chat is selected */}
      <div
        className={`${selectedFriend ? "hidden" : "w-full"} md:w-80 md:block h-auto md:h-full border-b md:border-b-0 md:border-r`}
      >
        <Sidebar
          onSelectFriend={setSelectedFriend}
          selectedFriendId={selectedFriend?.id}
        />
      </div>

      {/* Chat Area - Full screen on mobile, flex-1 on desktop */}
      {selectedFriend ? (
        <ChatArea
          selectedFriend={selectedFriend}
          currentUser={user}
          onBack={() => setSelectedFriend(null)}
        />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 text-gray-500">
          <p>Select a friend to start chatting</p>
        </div>
      )}
    </div>
  );
}
