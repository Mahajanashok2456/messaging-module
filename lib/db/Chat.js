const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageTimestamp: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
chatSchema.index({ participants: 1 });
chatSchema.index({ participants: 1, updatedAt: -1 });

// Static method to find or create a chat between two users
chatSchema.statics.findOrCreateBetweenUsers = async function (
  userId1,
  userId2,
) {
  // Convert to strings for consistent comparison
  const id1 = userId1.toString();
  const id2 = userId2.toString();

  // Try to find existing chat - check if both participants exist (order independent)
  let chat = await this.findOne({
    $and: [
      { participants: id1 },
      { participants: id2 },
      { "participants.1": { $exists: true } }, // Ensure exactly 2 participants
      { "participants.2": { $exists: false } }, // No third participant
    ],
  });

  // If no chat exists, create one
  if (!chat) {
    chat = new this({
      participants: [id1, id2],
    });
    await chat.save();
  }

  return chat;
};

module.exports = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
