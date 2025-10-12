require('dotenv').config();
const jwt = require('jsonwebtoken');

// Test token verification with the same secret
const verifyToken = async () => {
  try {
    console.log('=== Token Verification Test ===\n');
    
    // First login to get a fresh token
    const axios = require('axios');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('Token received:', token.substring(0, 30) + '...');
    
    // Check token structure
    const parts = token.split('.');
    console.log('Token parts:', parts.length);
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('Decoded payload:', payload);
    console.log('Expiration:', new Date(payload.exp * 1000));
    console.log('Current time:', new Date());
    console.log('Token expired:', payload.exp * 1000 < Date.now());
    
    // Verify token with the same secret used in backend
    console.log('\nVerifying token with JWT_SECRET:', process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully:', decoded);
    
  } catch (error) {
    console.error('Verification failed:', error.message);
    console.error('Error:', error);
  }
};

verifyToken();