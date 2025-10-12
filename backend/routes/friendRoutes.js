const express = require('express');
const {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriendsList,
  searchUsers
} = require('../controllers/friendController');
const auth = require('../middleware/auth');

const router = express.Router();

// Original endpoints
router.post('/request', auth, sendFriendRequest);
router.put('/request/accept', auth, acceptFriendRequest);
router.put('/request/reject', auth, rejectFriendRequest);
router.get('/requests', auth, getFriendRequests);
router.get('/list', auth, getFriendsList);
router.get('/search', auth, searchUsers);

// Additional endpoints to match requirements
router.get('/me/requests', auth, getFriendRequests);
router.get('/me/friends', auth, getFriendsList);

module.exports = router;