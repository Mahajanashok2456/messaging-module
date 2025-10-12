require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Delete test users (users with test in username or email)
    const result = await User.deleteMany({
      $or: [
        { username: { $regex: /^test/i } },
        { email: { $regex: /^test.*@example\.com$/i } }
      ]
    });
    
    console.log(`Deleted ${result.deletedCount} test users`);
    
    // Show remaining users
    const remainingUsers = await User.find();
    console.log('Remaining users:', remainingUsers.map(u => ({ username: u.username, email: u.email })));
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    mongoose.connection.close();
  });