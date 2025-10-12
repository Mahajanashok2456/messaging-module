import axiosInstance from './axiosInstance';

interface UserData {
  username: string;
  email: string;
  password: string;
}

interface MessageData {
  recipientId: string;
  content: string;
}

// Auth APIs
export const registerUser = (userData: UserData) => {
  return axiosInstance.post('/auth/register', userData);
};

export const loginUser = (userData: { email: string; password: string }) => {
  return axiosInstance.post('/auth/login', userData);
};

export const getUserProfile = () => {
  return axiosInstance.get('/auth/profile');
};

// Friend APIs
export const sendFriendRequest = (recipientId: string) => {
  return axiosInstance.post('/friends/request', { recipientId });
};

export const acceptFriendRequest = (requestId: string) => {
  return axiosInstance.put('/friends/request/accept', { requestId });
};

export const rejectFriendRequest = (requestId: string) => {
  return axiosInstance.put('/friends/request/reject', { requestId });
};

// User APIs (new endpoints with path parameters)
export const sendUserFriendRequest = (targetId: string) => {
  return axiosInstance.post(`/users/request/${targetId}`);
};

export const acceptUserFriendRequest = (requesterId: string) => {
  return axiosInstance.post(`/users/request/${requesterId}/accept`);
};

export const rejectUserFriendRequest = (requesterId: string) => {
  return axiosInstance.post(`/users/request/${requesterId}/reject`);
};

export const getFriendRequests = () => {
  return axiosInstance.get('/friends/requests');
};

export const getFriendsList = () => {
  return axiosInstance.get('/friends/list');
};

// User APIs (aliases for friend endpoints)
export const getUserRequests = () => {
  return axiosInstance.get('/users/me/requests');
};

export const getUserFriends = () => {
  return axiosInstance.get('/users/me/friends');
};

export const getUserChats = () => {
  return axiosInstance.get('/users/me/chats');
};

export const searchUsers = (query: string) => {
  return axiosInstance.get(`/users/search?query=${query}`);
};

// Message APIs
export const sendMessage = (messageData: MessageData) => {
  return axiosInstance.post('/messages/send', messageData);
};

export const getChatHistory = (userId: string) => {
  return axiosInstance.get(`/messages/history/${userId}`);
};

// Chat APIs
export const getOrCreateChat = (recipientId: string) => {
  return axiosInstance.post('/chats/get-or-create', { recipientId });
};

export const getChatMessages = (chatId: string) => {
  return axiosInstance.get(`/chats/${chatId}/messages`);
};

// User APIs
export const getUserById = (userId: string) => {
  return axiosInstance.get(`/users/${userId}`);
};