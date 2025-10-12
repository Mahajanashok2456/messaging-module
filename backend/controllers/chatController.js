const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// Get or create chat (for direct messaging)
const getOrCreateChat = async (req, res) => {
  try {
    const { recipientId } = req.body;
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

    // Find or create chat between users
    const chat = await Chat.findOrCreateBetweenUsers(senderId, recipientId);
    
    res.json({
      chatId: chat._id,
      participants: chat.participants
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get chat messages by chat ID
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Validate that current user is part of the chat
    if (!chat.participants.some(participant => participant.toString() === currentUserId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get messages for this chat
    const messages = await Message.find({
      $or: [
        { sender: chat.participants[0], recipient: chat.participants[1] },
        { sender: chat.participants[1], recipient: chat.participants[0] }
      ]
    })
    .populate('sender', 'username')
    .populate('recipient', 'username')
    .sort({ timestamp: 1 }); // Sort by timestamp ascending

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOrCreateChat,
  getChatMessages
};