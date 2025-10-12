const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Send message
const sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user._id;

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Check if users are friends
    const sender = await User.findById(senderId);
    if (!sender.friends.includes(recipientId)) {
      return res.status(400).json({ message: 'You can only message friends' });
    }

    // Create and save message
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content
    });

    await message.save();

    // Populate sender and recipient info
    await message.populate('sender', 'username');
    await message.populate('recipient', 'username');
    
    // Update the chat's last message
    try {
      const chat = await Chat.findOrCreateBetweenUsers(senderId, recipientId);
      chat.lastMessage = content.substring(0, 50); // Store first 50 characters
      chat.lastMessageTimestamp = new Date();
      chat.updatedAt = new Date();
      await chat.save();
    } catch (chatError) {
      console.error('Error updating chat last message:', chatError.message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get chat history between two users
const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params; // The other user's ID
    const currentUserId = req.user._id;

    // Check if users are friends
    const currentUser = await User.findById(currentUserId);
    if (!currentUser.friends.includes(userId)) {
      return res.status(400).json({ message: 'You can only view chat history with friends' });
    }

    // Get messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    })
    .populate('sender', 'username _id')
    .populate('recipient', 'username _id')
    .sort({ timestamp: 1 }); // Sort by timestamp ascending

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getChatHistory
};