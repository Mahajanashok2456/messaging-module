import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserRequests, getUserFriends, getUserChats, searchUsers, sendFriendRequest, acceptUserFriendRequest, rejectUserFriendRequest } from '../utils/api';

interface User {
  _id: string;
  username: string;
  email: string;
}

interface FriendRequest {
  _id: string;
  from: User;
  createdAt: string;
}

interface Chat {
  _id: string;
  participants: User[];
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  lastMessageTimestamp: string;
}

const Home = () => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]); // Add chats state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout || (() => {});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    loadFriendRequests();
    loadFriends();
    loadChats(); // Load chats
  }, [user, navigate]);

  useEffect(() => {
    // If we're navigating to the home page from chat, refresh the friends list
    if (location.pathname === '/home') {
      loadFriends();
    }
  }, [location.pathname]);

  const loadFriendRequests = async () => {
    try {
      const response = await getUserRequests();
      setFriendRequests(response.data);
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
      console.error('Failed to load friend requests:', error.response?.data?.message || error.message);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await getUserFriends();
      setFriends(response.data);
    } catch (error: any) {
      console.error('Error loading friends:', error);
      console.error('Failed to load friends:', error.response?.data?.message || error.message);
    }
  };

  const loadChats = async () => {
    try {
      const response = await getUserChats();
      setChats(response.data);
    } catch (error: any) {
      console.error('Error loading chats:', error);
      console.error('Failed to load chats:', error.response?.data?.message || error.message);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await searchUsers(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (recipientId: string) => {
    try {
      await sendFriendRequest(recipientId);
      // Remove from search results after sending request
      setSearchResults(searchResults.filter(user => user._id !== recipientId));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    try {
      // Show loading state or disable buttons
      setLoading(true);
      
      // Wait for the friend request to be accepted
      const response = await acceptUserFriendRequest(requesterId);
      console.log('Friend request accepted:', response);
      
      // Refresh friend requests, friends list, and chats
      // Wait for all to complete
      await Promise.all([
        loadFriendRequests(),
        loadFriends(),
        loadChats() // Load chats after accepting friend request
      ]);
      
      // Optional: Show success message to user
      console.log('Friendship established successfully');
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      // Optional: Show error message to user
      console.error('Failed to accept friend request:', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requesterId: string) => {
    try {
      // Show loading state or disable buttons
      setLoading(true);
      
      // Wait for the friend request to be rejected
      const response = await rejectUserFriendRequest(requesterId);
      console.log('Friend request rejected:', response);
      
      // Refresh friend requests
      await loadFriendRequests();
      
      // Optional: Show success message to user
      console.log('Friend request rejected successfully');
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
      // Optional: Show error message to user
      console.error('Failed to reject friend request:', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFriendClick = (friendId: string) => {
    navigate(`/chat/${friendId}`);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Messaging App</h1>
        </div>
        
        <nav className="sidebar-nav">
          <button
            onClick={() => setActiveTab('friends')}
            className={`sidebar-nav-item ${activeTab === 'friends' ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">👥</span>
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`sidebar-nav-item ${activeTab === 'requests' ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">📩</span>
            Requests ({friendRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`sidebar-nav-item ${activeTab === 'chats' ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">💬</span>
            Chats ({chats.length})
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.username}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1 className="header-title">
            {activeTab === 'friends' && 'Your Friends'}
            {activeTab === 'requests' && 'Friend Requests'}
            {activeTab === 'chats' && 'Your Chats'}
          </h1>
        </div>
        
        {activeTab === 'friends' && (
          <div className="card">
            {friends.length === 0 ? (
              <p className="text-gray">You don't have any friends yet.</p>
            ) : (
              <div className="friends-list">
                {friends.map((friend) => (
                  <div 
                    key={friend._id} 
                    className="friend-item cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => handleFriendClick(friend._id)}
                  >
                    <div className="friend-avatar">
                      {friend.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="friend-info flex-1">
                      <div className="friend-name">{friend.username}</div>
                      <div className="friend-status">{friend.email}</div>
                    </div>
                    <div className="friend-actions">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'requests' && (
          <div className="card">
            {friendRequests.length === 0 ? (
              <p className="text-gray">No pending friend requests.</p>
            ) : (
              <div className="friends-list">
                {friendRequests.map((request) => (
                  <div key={request._id} className="friend-item">
                    <div className="friend-avatar">
                      {request.from.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">{request.from.username}</div>
                      <div className="friend-status">{request.from.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptRequest(request.from._id)}
                        disabled={loading}
                        className="test-auth-button test-auth-button-success"
                      >
                        {loading ? 'Accepting...' : 'Accept'}
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(request.from._id)}
                        disabled={loading}
                        className="test-auth-button test-auth-button-danger"
                      >
                        {loading ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'chats' && (
          <div className="card">
            {chats.length === 0 ? (
              <p className="text-gray">No chats yet. Accept a friend request to start chatting.</p>
            ) : (
              <div className="friends-list">
                {chats.map((chat) => {
                  // Find the other participant (not the current user)
                  const otherParticipant = chat.participants.find(
                    participant => participant._id !== user?._id
                  );
                  
                  if (!otherParticipant) return null;
                  
                  return (
                    <div 
                      key={chat._id} 
                      className="friend-item cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                      onClick={() => handleFriendClick(otherParticipant._id)}
                    >
                      <div className="friend-avatar">
                        {otherParticipant.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="friend-info flex-1">
                        <div className="friend-name">{otherParticipant.username}</div>
                        <div className="friend-status">
                          {chat.lastMessage ? chat.lastMessage : 'No messages yet'}
                        </div>
                      </div>
                      <div className="friend-actions">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Search Section */}
        <div className="card mt-4">
          <h2 className="auth-form-title">Find Friends</h2>
          <div className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email"
              className="auth-form-input flex-1"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="auth-form-button ml-2"
            >
              Search
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="auth-form-title text-lg">Search Results</h3>
              <div className="friends-list">
                {searchResults.map((user) => (
                  <div key={user._id} className="friend-item">
                    <div className="friend-avatar">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">{user.username}</div>
                      <div className="friend-status">{user.email}</div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user._id)}
                      disabled={loading}
                      className="test-auth-button test-auth-button-primary"
                    >
                      {loading ? 'Sending...' : 'Send Request'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;