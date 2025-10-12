const User = require('../models/User');
const Chat = require('../models/Chat'); // Add Chat model
const { sendFriendRequestNotification } = require('./notificationController');
const mongoose = require('mongoose');

// Alias for getFriendRequests
const getUserRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friendRequests.from', 'username email')
      .select('friendRequests');
      
    res.json(user.friendRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Alias for getFriendsList
const getUserFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username email _id') // Include _id in the population
      .select('friends');
      
    // Ensure we return an array even if friends is null/undefined
    const friendsList = user.friends || [];
    res.json(friendsList);
  } catch (error) {
    console.error('Error getting user friends:', error);
    res.status(500).json({ message: 'Internal server error while fetching friends list' });
  }
};

// Send friend request using path parameter
const sendUserFriendRequest = async (req, res) => {
  try {
    const { targetId: recipientId } = req.params;
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

// Accept friend request using path parameter
const acceptUserFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const userId = req.user._id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(requesterId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the requesterId is in friend requests
    const requestIndex = user.friendRequests.findIndex(
      request => request.from && request.from.toString() === requesterId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Add each other as friends (with validation)
    if (!user.friends.includes(requesterId)) {
      user.friends.push(requesterId);
      await user.save();
    }

    const requester = await User.findById(requesterId);
    if (!requester) {
      return res.status(404).json({ message: 'Requester not found' });
    }
    
    if (!requester.friends.includes(userId)) {
      requester.friends.push(userId);
      await requester.save();
    }

    // Remove the request from both users
    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    // Remove from sender's sent requests (with better error handling)
    try {
      const sentRequestIndex = requester.sentRequests.findIndex(
        req => req.to && req.to.toString() === userId.toString()
      );
      
      if (sentRequestIndex !== -1) {
        requester.sentRequests.splice(sentRequestIndex, 1);
        await requester.save();
      }
    } catch (sentRequestError) {
      console.warn('Warning: Could not remove sent request from requester:', sentRequestError.message);
    }

    // Create a chat document between the two users if it doesn't already exist
    try {
      // Check if a chat already exists between these two users
      const existingChat = await Chat.findOne({
        participants: {
          $all: [userId, requesterId],
          $size: 2
        }
      });

      if (!existingChat) {
        // Create a new chat document
        const newChat = new Chat({
          participants: [userId, requesterId],
          lastMessage: '',
          lastMessageTimestamp: null
        });
        await newChat.save();
        console.log('Created new chat between users:', userId, requesterId);
      } else {
        console.log('Chat already exists between users:', userId, requesterId);
      }
    } catch (chatError) {
      console.error('Error creating chat document:', chatError.message);
      // Don't fail the friend request acceptance if chat creation fails
    }

    res.json({ 
      message: 'Friend request accepted successfully',
      chatCreated: true
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Internal server error while accepting friend request' });
  }
};

// Reject friend request using path parameter
const rejectUserFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    // Check if the requesterId is in friend requests
    const requestIndex = user.friendRequests.findIndex(
      request => request.from.toString() === requesterId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

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

// Get user's chats
const getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all chats where the user is a participant
    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'username email _id')
    .sort({ updatedAt: -1 }); // Sort by most recently updated
    
    res.json(chats);
  } catch (error) {
    console.error('Error getting user chats:', error);
    res.status(500).json({ message: 'Internal server error while fetching chats' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const user = await User.findById(id).select('username email _id');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ message: 'Internal server error while fetching user' });
  }
};

module.exports = {
  getUserRequests,
  getUserFriends,
  sendUserFriendRequest,
  acceptUserFriendRequest,
  rejectUserFriendRequest,
  searchUsers,
  getUserChats, // Add this
  getUserById // Add this
};