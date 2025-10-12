const mongoose = require('mongoose');
const { encryptMessage, decryptMessage } = require('../utils/encryption');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Encrypt message before saving
messageSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.content = encryptMessage(this.content);
  }
  next();
});

// Decrypt message when retrieving
messageSchema.post('init', function(doc) {
  if (doc.content && typeof doc.content === 'string' && doc.content.startsWith('U2FsdGVkX1')) {
    try {
      doc.content = decryptMessage(doc.content);
    } catch (error) {
      console.error('Decryption error for message:', doc._id, error);
      // If decryption fails, keep the encrypted content
    }
  }
});

// Decrypt message when finding
messageSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.content && typeof doc.content === 'string' && doc.content.startsWith('U2FsdGVkX1')) {
        try {
          doc.content = decryptMessage(doc.content);
        } catch (error) {
          console.error('Decryption error for message:', doc._id, error);
          // If decryption fails, keep the encrypted content
        }
      }
    });
  }
});

// Decrypt message when finding one
messageSchema.post('findOne', function(doc) {
  if (doc && doc.content && typeof doc.content === 'string' && doc.content.startsWith('U2FsdGVkX1')) {
    try {
      doc.content = decryptMessage(doc.content);
    } catch (error) {
      console.error('Decryption error for message:', doc._id, error);
      // If decryption fails, keep the encrypted content
    }
  }
});

// Decrypt message after saving (for immediate use)
messageSchema.post('save', function(doc) {
  if (doc.content && typeof doc.content === 'string' && doc.content.startsWith('U2FsdGVkX1')) {
    try {
      doc.content = decryptMessage(doc.content);
    } catch (error) {
      console.error('Decryption error for message:', doc._id, error);
      // If decryption fails, keep the encrypted content
    }
  }
});

module.exports = mongoose.model('Message', messageSchema);