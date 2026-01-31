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
  MoreVertical
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

type ViewMode = 'chats' | 'requests' | 'search' | 'friends';

export default function Sidebar({ onSelectFriend, selectedFriendId }: SidebarProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('chats');
  
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

    // Socket Listener for real-time updates
    const socket = getSocket();
    if (socket) {
      socket.on("receive_message", (message: any) => {
        // When a new message arrives, refresh chats to update order and last message
        // Ideally we would optimistically update, but fetching is safer for now
        fetchChats();
      });
      
      socket.on("message_sent", () => {
         fetchChats();
      });
    }

    return () => {
      if (socket) {
        socket.off("receive_message");
        socket.off("message_sent");
      }
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
      const response = await api.get("/api/auth/profile");
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
      const response = await api.get("/api/users/me/chats");
      setChats(response.data);
    } catch (error) {
      console.error("Failed to fetch chats", error);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const response = await api.get("/api/friends/list");
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
      const response = await api.get("/api/friends/requests");
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
      const response = await api.get(`/api/friends/search?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Failed to search users", error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await api.post("/api/friends/request", { recipientId: userId });
      setSearchResults(prev => prev.filter(user => user.id !== userId));
      alert("Friend request sent!");
    } catch (error: any) {
      console.error("Failed to send request", error);
      alert(error.response?.data?.message || "Failed to send request");
    }
  };

  const handleRequestResponse = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await api.put(`/api/friends/request/${action}`, { requestId });
      
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      if (action === 'accept') {
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
      const response = await api.put("/api/users/profile", { username: newName });
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
    return chat.participants.find(p => p._id !== currentUser._id);
  };

  const handleChatSelect = (chat: Chat) => {
    const otherUser = getOtherParticipant(chat);
    if (otherUser) {
      onSelectFriend({
        id: otherUser._id,
        username: otherUser.username,
        email: otherUser.email
      });
    }
  };
  
  const handleUserSelectFromSearch = (user: SearchResult) => {
      // Do not allow selecting non-friends
      // We could prompt to add friend, but UI handles that with button
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10">
      {/* Header / Navigation */}
      <div className="p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-around items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setView('chats')}
            className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'chats' 
                ? "bg-indigo-100 text-indigo-700" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <MessageSquare size={18} className="mr-2" />
            Chats
          </button>
          
          <button
            onClick={() => setView('friends')} // New view
            className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'friends' 
                ? "bg-indigo-100 text-indigo-700" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
            title="All Friends"
          >
            <User size={18} className="mr-2" />
            Friends
          </button>
          
          <button
            onClick={() => setView('requests')}
            className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-colors relative ${
              view === 'requests' 
                ? "bg-indigo-100 text-indigo-700" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <UserPlus size={18} className="mr-2" />
            Requests
            {requests.length > 0 && (
              <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          <button
            onClick={() => setView('search')}
            className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'search' 
                ? "bg-indigo-100 text-indigo-700" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <Search size={18} className="mr-2" />
            Search
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        
        {/* VIEW: CHATS */}
        {view === 'chats' && (
          <div>
            <div className="p-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recent Chats
              </h3>
            </div>
            
            {loadingChats ? (
              <div className="flex justify-center items-center p-8 text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <MessageSquare size={48} className="text-gray-300 mb-2" />
                <p>No active chats.</p>
                <button 
                  onClick={() => setView('search')}
                  className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              <ul>
                {chats.map((chat) => {
                  const otherUser = getOtherParticipant(chat);
                  if (!otherUser) return null;
                  
                  return (
                    <li
                      key={chat._id}
                      onClick={() => handleChatSelect(chat)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors flex items-center space-x-3 ${
                        selectedFriendId === otherUser._id ? "bg-indigo-50 border-l-4 border-l-indigo-500" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                          {otherUser.username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                           <p className="text-sm font-medium text-gray-900 truncate">{otherUser.username}</p>
                           {chat.updatedAt && (
                               <span className="text-xs text-gray-400">
                                   {new Date(chat.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </span>
                           )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                            {/* We could show last message here if backend provided it clearly, otherwise email */}
                            {otherUser.email}
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
        {view === 'requests' && (
          <div>
             <div className="p-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Friend Requests ({requests.length})
              </h3>
            </div>

            {loadingRequests ? (
              <div className="flex justify-center items-center p-8 text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading...
              </div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No pending requests.</p>
              </div>
            ) : (
              <ul>
                {requests.map((req) => (
                  <li key={req.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                          {req.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{req.username}</p>
                          <p className="text-xs text-gray-500">{req.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-2 pl-12">
                      <button
                        onClick={() => handleRequestResponse(req.id, 'accept')}
                        className="flex-1 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-indigo-700 flex items-center justify-center transition-colors"
                      >
                        <Check size={14} className="mr-1" /> Accept
                      </button>
                      <button
                        onClick={() => handleRequestResponse(req.id, 'reject')}
                        className="flex-1 bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-md hover:bg-gray-200 flex items-center justify-center transition-colors"
                      >
                        <X size={14} className="mr-1" /> Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* VIEW: SEARCH */}
        {view === 'search' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Type to find new friends</p>
                </div>
              ) : (
                <ul>
                  {searchResults.map((user) => (
                    <li key={user.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 flex items-center justify-between cursor-default">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 flex items-center">
                            {user.username}
                            {user.isFriend && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                Friend
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
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
                                isOnline: user.isOnline
                              });
                          }}
                          className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                          title="Message Friend"
                        >
                          <MessageSquare size={20} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                              e.stopPropagation();
                              sendFriendRequest(user.id);
                          }}
                          className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                          title="Add Friend"
                        >
                          <UserPlus size={20} />
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
      
      {/* Footer / User Profile */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {currentUser ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
               <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
                  {currentUser.username.charAt(0).toUpperCase()}
               </div>
               
               {isEditingProfile ? (
                 <div className="flex-1 flex items-center space-x-2">
                   <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full text-sm border rounded px-1 py-0.5"
                   />
                   <button onClick={handleUpdateProfile} className="text-green-600 hover:text-green-800">
                     <Save size={16} />
                   </button>
                   <button onClick={() => setIsEditingProfile(false)} className="text-gray-500 hover:text-gray-700">
                     <X size={16} />
                   </button>
                 </div>
               ) : (
                 <div className="flex-1 min-w-0 group">
                    <p className="text-sm font-bold text-gray-900 truncate flex items-center">
                        {currentUser.username}
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="ml-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit2 size={12} />
                        </button>
                    </p>
                    <p className="text-xs text-gray-500 truncate">Online</p>
                 </div>
               )}
            </div>
            
            <button 
              onClick={handleLogout}
              className="ml-2 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-400 text-xs">Loading profile...</div>
        )}
      </div>
    </div>
  );
}
