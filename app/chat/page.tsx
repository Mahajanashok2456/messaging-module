"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import { getSocket, disconnectSocket } from "@/lib/socket";
import api from "@/lib/api";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get("auth/profile");
        const profile = response.data?.data?.user;

        if (!profile) {
          router.push("/login");
          return;
        }

        setUser(profile);
        localStorage.setItem("user", JSON.stringify(profile));

        try {
          await api.get("auth/csrf");
        } catch (csrfError) {
          console.warn("Failed to refresh CSRF token");
        }
      } catch (error) {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize socket
    const socket = getSocket();
    if (socket) {
      // You can add global socket listeners here if needed
    }

    loadUser();

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
