require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const users = await User.find();
    console.log('Users in database:', users);
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    mongoose.connection.close();
  });