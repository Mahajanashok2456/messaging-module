const express = require('express');
const { 
  getUserRequests, 
  getUserFriends, 
  sendUserFriendRequest, 
  acceptUserFriendRequest, 
  rejectUserFriendRequest,
  searchUsers,
  getUserChats, // Add this
  getUserById // Add this
} = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

// User friends and requests endpoints
router.get('/me/requests', auth, getUserRequests);
router.get('/me/friends', auth, getUserFriends);
router.get('/me/chats', auth, getUserChats); // Add this route

// Friend request endpoints with path parameters
router.post('/request/:targetId', auth, sendUserFriendRequest);
router.post('/request/:requesterId/accept', auth, acceptUserFriendRequest);
router.post('/request/:requesterId/reject', auth, rejectUserFriendRequest);

// Search users
router.get('/search', auth, searchUsers);

// Get user by ID
router.get('/:id', auth, getUserById);

module.exports = router;