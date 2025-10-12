const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTimestamp: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatSchema.index({ participants: 1 });

// Static method to find or create a chat between two users
chatSchema.statics.findOrCreateBetweenUsers = async function(userId1, userId2) {
  // Try to find existing chat
  let chat = await this.findOne({
    participants: {
      $all: [userId1, userId2],
      $size: 2
    }
  });
  
  // If no chat exists, create one
  if (!chat) {
    chat = new this({
      participants: [userId1, userId2]
    });
    await chat.save();
  }
  
  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);