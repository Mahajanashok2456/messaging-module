import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useSocket } from '../context/SocketContext';
import { getChatHistory, getUserById } from '../utils/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface User {
  _id: string;
  username: string;
  email: string;
}

interface Message {
  _id: string;
  sender: User;
  recipient: User;
  content: string;
  timestamp: string;
}

// Update the component to work with routing
const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [friend, setFriend] = useState<User | null>(null);
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const user = auth?.user;

  // Fetch friend data when component mounts
  useEffect(() => {
    if (friendId) {
      fetchFriendDetails();
      loadChatHistory();
    }
  }, [friendId]);

  const fetchFriendDetails = async () => {
    if (!friendId) return;
    
    try {
      const response = await getUserById(friendId);
      setFriend(response.data);
    } catch (error) {
      console.error('Error fetching friend details:', error);
    }
  };

  useEffect(() => {
    if (friendId && user) {
      // Join the chat room
      if (socket) {
        socket.emit('join_chat', { chatId: [user._id, friendId].sort().join('-') });
      }
      
      // Load chat history when component mounts
      loadChatHistory();
    }
    
    return () => {
      // Leave the chat room when component unmounts
      if (socket && friendId && user) {
        // Note: Socket.IO doesn't have a built-in leave event, but rooms are automatically left on disconnect
      }
    };
  }, [friendId, socket, user]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message) => {
        if (friendId && user) {
          // Check if the message already exists to prevent duplicates
          setMessages(prev => {
            // Check if message already exists by _id
            const messageExists = prev.some(msg => msg._id === message._id);
            if (!messageExists) {
              return [...prev, message];
            }
            return prev;
          });
        }
      });

      socket.on('message_sent', (data) => {
        // Update the message with the server-generated ID
        setMessages(prev => {
          // Replace the temporary message with the saved one
          return prev.map(msg => 
            msg._id === data.messageId ? data.savedMessage : msg
          );
        });
      });

      socket.on('message_error', (data) => {
        // Handle message sending errors
        console.error('Message sending error:', data.error);
        // Remove the temporary message if sending failed
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      });

      socket.on('typing', (data) => {
        if (data.userId === friendId) {
          setIsTyping(true);
        }
      });

      socket.on('stop_typing', (data) => {
        if (data.userId === friendId) {
          setIsTyping(false);
        }
      });

      socket.on('user_connected', (data) => {
        console.log('User connected:', data.userId);
      });

      return () => {
        socket.off('receive_message');
        socket.off('message_sent');
        socket.off('message_error');
        socket.off('typing');
        socket.off('stop_typing');
        socket.off('user_connected');
      };
    }
  }, [socket, friendId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    if (!friendId) return;
    
    try {
      setLoading(true);
      const response = await getChatHistory(friendId);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !friendId || !user) return;
    
    // Generate a temporary ID for the message
    const tempMessageId = `temp_${Date.now()}`;
    
    // Add the message to the UI immediately
    const tempMessage: Message = {
      _id: tempMessageId,
      sender: { 
        _id: user._id, 
        username: user.username,
        email: user.email || ''
      },
      recipient: { 
        _id: friendId, 
        username: friend?.username || 'Friend',
        email: ''
      },
      content: newMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    
    try {
      // Emit message through socket only (no duplicate REST API call)
      const roomId = [user._id, friendId].sort().join('-');
      socket.emit('send_message', {
        room: roomId,
        senderId: user._id,
        recipientId: friendId,
        content: newMessage,
        tempMessageId: tempMessageId, // Send the temporary ID
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message if sending failed
      setMessages(prev => prev.filter(msg => msg._id !== tempMessageId));
    }
  };

  const handleClose = () => {
    navigate('/home');
  };

  if (!friendId || !user) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{friend?.username || 'Chat'}</h3>
            <p className="text-sm text-gray-500">Online</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isSentByCurrentUser = message.sender._id === user._id;
              return (
                <div
                  key={message._id}
                  className={`flex ${isSentByCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`message-bubble ${isSentByCurrentUser ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">{message.content}</div>
                    <div className={`message-time ${isSentByCurrentUser ? 'sent' : 'received'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
        {isTyping && (
          <div className="flex items-center text-gray-500 text-sm mt-2">
            <span>{friend?.username || 'Friend'} is typing</span>
            <div className="flex ml-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mx-1 animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full mx-1 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full mx-1 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Message input */}
      <div className="border-t border-gray-200 px-4 py-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              // Emit typing event
              if (socket && friendId) {
                if (e.target.value) {
                  socket.emit('typing', { userId: friendId });
                } else {
                  socket.emit('stop_typing', { userId: friendId });
                }
              }
            }}
            onBlur={() => {
              // Emit stop typing when user leaves the input
              if (socket && friendId) {
                socket.emit('stop_typing', { userId: friendId });
              }
            }}
            placeholder="Type a message..."
            className="flex-1 min-w-0 block w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;