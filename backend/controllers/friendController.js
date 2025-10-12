const User = require('../models/User');
const { sendFriendRequestNotification } = require('./notificationController');

// Send friend request
const sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.user._id;

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if trying to add self
    if (senderId.toString() === recipientId) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend' });
    }

    // Check if already friends
    if (recipient.friends.includes(senderId)) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    // Check if request already sent
    const existingRequest = recipient.friendRequests.find(
      request => request.from.toString() === senderId.toString()
    );
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Add request to recipient
    recipient.friendRequests.push({ from: senderId });
    await recipient.save();

    // Add to sender's sent requests
    const sender = await User.findById(senderId);
    sender.sentRequests.push({ to: recipientId });
    await sender.save();

    // Send notification to recipient
    await sendFriendRequestNotification(recipientId, sender);

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    // Find the request
    const requestIndex = user.friendRequests.findIndex(
      req => req._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    const requesterId = user.friendRequests[requestIndex].from;

    // Add each other as friends
    user.friends.push(requesterId);
    await user.save();

    const requester = await User.findById(requesterId);
    requester.friends.push(userId);
    await requester.save();

    // Remove the request from both users
    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    const sentRequestIndex = requester.sentRequests.findIndex(
      req => req.to.toString() === userId.toString()
    );
    
    if (sentRequestIndex !== -1) {
      requester.sentRequests.splice(sentRequestIndex, 1);
      await requester.save();
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject friend request
const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    // Find the request
    const requestIndex = user.friendRequests.findIndex(
      req => req._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    const requesterId = user.friendRequests[requestIndex].from;

    // Remove the request from user
    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    // Remove from sender's sent requests
    const requester = await User.findById(requesterId);
    const sentRequestIndex = requester.sentRequests.findIndex(
      req => req.to.toString() === userId.toString()
    );
    
    if (sentRequestIndex !== -1) {
      requester.sentRequests.splice(sentRequestIndex, 1);
      await requester.save();
    }

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get friend requests
const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friendRequests.from', 'username email')
      .select('friendRequests');
      
    res.json(user.friendRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get friends list
const getFriendsList = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username email _id') // Include _id in the population
      .select('friends');
      
    // Ensure we return an array even if friends is null/undefined
    const friendsList = user.friends || [];
    res.json(friendsList);
  } catch (error) {
    console.error('Error getting friends list:', error);
    res.status(500).json({ message: 'Internal server error while fetching friends list' });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }
    
    // Search by username or email (exclude current user)
    // Also exclude users already in friend list or with pending requests
    const currentUser = await User.findById(req.user._id)
      .populate('friends', '_id')
      .populate('sentRequests.to', '_id')
      .populate('friendRequests.from', '_id');
    
    const friendIds = currentUser.friends.map(friend => friend._id);
    const sentRequestIds = currentUser.sentRequests.map(req => req.to._id);
    const receivedRequestIds = currentUser.friendRequests.map(req => req.from._id);
    
    const excludeIds = [
      req.user._id,
      ...friendIds,
      ...sentRequestIds,
      ...receivedRequestIds
    ];
    
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        },
        {
          _id: { $nin: excludeIds }
        }
      ]
    })
    .select('username email profilePicture isOnline')
    .limit(20); // Limit results for performance
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriendsList,
  searchUsers
};