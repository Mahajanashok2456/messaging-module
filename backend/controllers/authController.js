const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register user
const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return next(new AppError('Please provide username, email and password', 400));
    }
    
    // Additional validation for password length
    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long', 400));
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return next(new AppError('User with this email or username already exists', 400));
    }
    
    // Create user
    const user = new User({ username, email, password });
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new AppError(messages.join(', '), 400));
    }
    next(error);
  }
};

// Login user
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password', 401));
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user profile
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile
};