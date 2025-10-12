const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/authRoutes');
const friendRoutes = require('./routes/friendRoutes');
const messageRoutes = require('./routes/messageRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

// Connect to MongoDB
connectDB();

// Simple route for testing
app.get('/', (req, res) => {
  res.send('Real-time Messaging API is running...');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Emit user_connected event
  socket.emit('user_connected', { userId: socket.id });

  socket.on('join_room', (data) => {
    socket.join(data.room);
    console.log(`User with ID: ${socket.id} joined room: ${data.room}`);
  });

  // Add explicit join_chat event
  socket.on('join_chat', (data) => {
    socket.join(data.chatId);
    console.log(`User with ID: ${socket.id} joined chat: ${data.chatId}`);
  });

  socket.on('send_message', async (data) => {
    // Save message to database
    const Message = require('./models/Message');
    const message = new Message({
      sender: data.senderId,
      recipient: data.recipientId,
      content: data.content,
      timestamp: new Date()
    });
    
    try {
      await message.save();
      // Populate sender and recipient info
      await message.populate('sender', 'username');
      await message.populate('recipient', 'username');
      
      // Emit to both users' rooms
      const roomId = [data.senderId, data.recipientId].sort().join('-');
      io.to(roomId).emit('receive_message', message);
      
      // Emit message_sent confirmation to sender with the saved message
      socket.emit('message_sent', { 
        messageId: data.tempMessageId, // Echo back the client-generated ID
        savedMessage: message 
      });
      
      console.log('Message sent:', message);
    } catch (error) {
      console.error('Error saving message:', error);
      // Emit error to sender
      socket.emit('message_error', { 
        messageId: data.tempMessageId,
        error: error.message 
      });
    }
  });

  socket.on('typing', (data) => {
    const roomId = [data.userId, socket.id].sort().join('-');
    socket.to(roomId).emit('typing', { userId: socket.id });
  });

  socket.on('stop_typing', (data) => {
    const roomId = [data.userId, socket.id].sort().join('-');
    socket.to(roomId).emit('stop_typing', { userId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Export app for testing
module.exports = app;

// Only start server if this file is run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}