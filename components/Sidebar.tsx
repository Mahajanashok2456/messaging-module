"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  User,
  MessageSquare,
  UserPlus,
  Search,
  Check,
  X,
  Loader2,
  LogOut,
  Edit2,
  Save,
  MoreVertical,
} from "lucide-react";

interface Friend {
  id: string;
  username: string;
  email: string;
  isOnline?: boolean;
}

interface Chat {
  _id: string;
  participants: {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
  }[];
  lastMessage?: string;
  updatedAt: string;
}

interface FriendRequest {
  id: string;
  from: string;
  username: string;
  email: string;
}

interface SearchResult {
  id: string;
  username: string;
  email: string;
  isOnline?: boolean;
  isFriend?: boolean;
}

interface SidebarProps {
  onSelectFriend: (friend: Friend) => void;
  selectedFriendId?: string;
}

type ViewMode = "chats" | "requests" | "search" | "friends";

export default function Sidebar({
  onSelectFriend,
  selectedFriendId,
}: SidebarProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("chats");

  // Data States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // UI States
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newName, setNewName] = useState("");

  // Initial Data Fetch
  useEffect(() => {
    fetchCurrentUser();
    fetchChats();
    fetchFriends();
    fetchRequests();
  }, []);

  // Socket Listener for real-time updates (separate effect to get latest fetchChats)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const debouncedFetchChats = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchChats();
      }, 300);
    };

    const handleReceiveMessage = () => {
      // When a new message arrives, refresh chats to update order and last message
      debouncedFetchChats();
    };

    const handleMessageSent = () => {
      debouncedFetchChats();
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_sent", handleMessageSent);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_sent", handleMessageSent);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  // Debounce Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get("auth/profile");
      setCurrentUser(response.data.data.user);
      setNewName(response.data.data.user.username);
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      // Fetch active chats sorted by updatedAt
      const response = await api.get("users/me/chats");
      // Deduplicate chats by chat ID
      const uniqueChats = Array.from(
        new Map(
          (response.data || []).map((chat: Chat) => [chat._id, chat]),
        ).values(),
      ) as Chat[];
      setChats(uniqueChats);
    } catch (error) {
      console.error("Failed to fetch chats", error);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const response = await api.get("friends/list");
      setFriends(response.data);
    } catch (error) {
      console.error("Failed to fetch friends", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await api.get("friends/requests");
      setRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await api.get(
        `/api/friends/search?query=${encodeURIComponent(query)}`,
      );
      setSearchResults(response.data);
    } catch (error) {
      console.error("Failed to search users", error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await api.post("friends/request", { recipientId: userId });
      setSearchResults((prev) => prev.filter((user) => user.id !== userId));
      alert("Friend request sent!");
    } catch (error: any) {
      console.error("Failed to send request", error);
      alert(error.response?.data?.message || "Failed to send request");
    }
  };

  const handleRequestResponse = async (
    requestId: string,
    action: "accept" | "reject",
  ) => {
    try {
      await api.put(`/api/friends/request/${action}`, { requestId });

      setRequests((prev) => prev.filter((req) => req.id !== requestId));

      if (action === "accept") {
        fetchChats(); // Refresh chats
        fetchFriends(); // Refresh friends list
        alert("Friend request accepted!");
      }
    } catch (error: any) {
      console.error(`Failed to ${action} request`, error);
      alert(error.response?.data?.message || `Failed to ${action} request`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleUpdateProfile = async () => {
    if (!newName.trim()) return;
    try {
      const response = await api.put("/api/users/profile", {
        username: newName,
      });
      setCurrentUser(response.data);
      setIsEditingProfile(false);
      alert("Profile updated successfully!");
    } catch (error: any) {
      console.error("Failed to update profile", error);
      alert("Failed to update profile");
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    if (!currentUser) return null;
    return chat.participants.find((p) => p._id !== currentUser._id);
  };

  const handleChatSelect = (chat: Chat) => {
    const otherUser = getOtherParticipant(chat);
    if (otherUser) {
      onSelectFriend({
        id: otherUser._id,
        username: otherUser.username,
        email: otherUser.email,
      });
    }
  };

  const handleUserSelectFromSearch = (user: SearchResult) => {
    // Do not allow selecting non-friends
    // We could prompt to add friend, but UI handles that with button
  };

  return (
    <div className="w-80 bg-white border-r border-gray-300 flex flex-col h-full shadow-lg z-10">
      {/* Header / Navigation - WhatsApp style */}
      <div className="bg-[#008069] p-4">
        <div className="flex items-center justify-between text-white mb-3">
          <h2 className="text-xl font-medium">WhatsApp</h2>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="flex space-x-2 bg-white/10 rounded-full p-1">
          <button
            onClick={() => setView("chats")}
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all ${
              view === "chats"
                ? "bg-white text-[#008069]"
                : "text-white/90 hover:text-white"
            }`}
          >
            Chats
          </button>

          <button
            onClick={() => setView("friends")}
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all ${
              view === "friends"
                ? "bg-white text-[#008069]"
                : "text-white/90 hover:text-white"
            }`}
          >
            Friends
          </button>

          <button
            onClick={() => setView("requests")}
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all relative ${
              view === "requests"
                ? "bg-white text-[#008069]"
                : "text-white/90 hover:text-white"
            }`}
          >
            Requests
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#25D366] text-white text-xs flex items-center justify-center font-semibold">
                {requests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setView("search")}
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-all ${
              view === "search"
                ? "bg-white text-[#008069]"
                : "text-white/90 hover:text-white"
            }`}
          >
            Search
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* VIEW: CHATS */}
        {view === "chats" && (
          <div>
            {loadingChats ? (
              <div className="flex justify-center items-center p-8 text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <MessageSquare size={48} className="text-gray-300 mb-2" />
                <p>No active chats.</p>
                <button
                  onClick={() => setView("search")}
                  className="mt-4 text-[#008069] hover:text-[#006654] text-sm font-medium"
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {chats.map((chat) => {
                  const otherUser = getOtherParticipant(chat);
                  if (!otherUser) return null;

                  return (
                    <li
                      key={chat._id}
                      onClick={() => handleChatSelect(chat)}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                        selectedFriendId === otherUser._id ? "bg-gray-100" : ""
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {otherUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className="text-base font-medium text-gray-900 truncate">
                            {otherUser.username}
                          </p>
                          {chat.updatedAt && (
                            <span className="text-xs text-gray-500 ml-2">
                              {new Date(chat.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {chat.lastMessage || "Start chatting!"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* VIEW: REQUESTS */}
        {view === "requests" && (
          <div>
            {loadingRequests ? (
              <div className="flex justify-center items-center p-8 text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading...
              </div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <UserPlus size={48} className="mx-auto text-gray-300 mb-2" />
                <p>No pending requests.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <li key={req.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-orange-400 flex items-center justify-center text-white font-semibold text-lg">
                        {req.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900">
                          {req.username}
                        </p>
                        <p className="text-sm text-gray-500">{req.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 pl-[60px]">
                      <button
                        onClick={() => handleRequestResponse(req.id, "accept")}
                        className="flex-1 bg-[#25D366] text-white text-sm px-3 py-2 rounded-full hover:bg-[#128C7E] flex items-center justify-center transition-colors font-medium"
                      >
                        <Check size={16} className="mr-1" /> Accept
                      </button>
                      <button
                        onClick={() => handleRequestResponse(req.id, "reject")}
                        className="flex-1 bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-full hover:bg-gray-300 flex items-center justify-center transition-colors font-medium"
                      >
                        <X size={16} className="mr-1" /> Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* VIEW: FRIENDS */}
        {view === "friends" && (
          <div>
            {loadingFriends ? (
              <div className="flex justify-center items-center p-8 text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading...
              </div>
            ) : friends.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <User size={48} className="mx-auto text-gray-300 mb-2" />
                <p>No friends yet.</p>
                <p className="text-sm mt-2">
                  Accept requests or search for friends!
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {friends.map((friend) => (
                  <li
                    key={friend.id}
                    onClick={() => {
                      onSelectFriend({
                        id: friend.id,
                        username: friend.username,
                        email: friend.email,
                        isOnline: false,
                      });
                      setView("chats");
                    }}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white font-semibold text-lg">
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900">
                          {friend.username}
                        </p>
                        <p className="text-sm text-gray-500">{friend.email}</p>
                      </div>
                      <MessageSquare size={20} className="text-[#008069]" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* VIEW: SEARCH */}
        {view === "search" && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-full focus:outline-none focus:border-[#25D366] bg-gray-50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="flex justify-center items-center p-8 text-gray-400">
                  <Loader2 className="animate-spin mr-2" /> Searching...
                </div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No users found matching "{searchQuery}"</p>
                </div>
              ) : !searchQuery ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  <Search size={40} className="mx-auto mb-3 opacity-50" />
                  <p>Search for friends to chat with</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {searchResults.map((user) => (
                    <li
                      key={user.id}
                      className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold text-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-base font-medium text-gray-900 flex items-center">
                            {user.username}
                            {user.isFriend && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-[#d9fdd3] text-[#008069] rounded-full font-medium">
                                Friend
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>

                      {user.isFriend ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFriend({
                              id: user.id,
                              username: user.username,
                              email: user.email,
                              isOnline: user.isOnline,
                            });
                            setView("chats");
                          }}
                          className="text-[#008069] hover:bg-[#d9fdd3] p-2.5 rounded-full transition-colors"
                          title="Message Friend"
                        >
                          <MessageSquare size={22} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendFriendRequest(user.id);
                          }}
                          className="text-[#008069] hover:bg-[#d9fdd3] p-2.5 rounded-full transition-colors"
                          title="Add Friend"
                        >
                          <UserPlus size={22} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / User Profile - WhatsApp style */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {currentUser ? (
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-[#008069] flex items-center justify-center text-white font-semibold text-lg shadow-sm">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>

            {isEditingProfile ? (
              <div className="flex-1 flex items-center space-x-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 text-sm border-2 border-[#25D366] rounded-lg px-2 py-1 focus:outline-none"
                />
                <button
                  onClick={handleUpdateProfile}
                  className="text-[#25D366] hover:text-[#128C7E]"
                >
                  <Save size={18} />
                </button>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate flex items-center">
                  {currentUser.username}
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="ml-2 text-gray-400 hover:text-[#008069]"
                  >
                    <Edit2 size={14} />
                  </button>
                </p>
                <p className="text-sm text-[#25D366] truncate">● Online</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 text-sm">
            Loading profile...
          </div>
        )}
      </div>
    </div>
  );
}
