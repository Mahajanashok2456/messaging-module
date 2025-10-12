require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('Test user already exists:', existingUser.username);
      mongoose.connection.close();
      return;
    }
    
    // Create a new test user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    
    await user.save();
    console.log('Created test user:', user.username);
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    mongoose.connection.close();
  });