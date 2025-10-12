require('dotenv').config();
const axios = require('axios');

// Test login with existing test user
const testLogin = async () => {
  const baseURL = 'http://localhost:5000/api';
  const axiosInstance = axios.create({ baseURL });
  
  try {
    console.log('=== Testing Login ===\n');
    
    // Login with existing test user
    console.log('Logging in with test@example.com...');
    const loginResponse = await axiosInstance.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token:', loginResponse.data.data.token.substring(0, 30) + '...');
    console.log('User:', loginResponse.data.data.user.username);
    
    const token = loginResponse.data.data.token;
    
    // Test profile access with the token
    console.log('\nTesting profile access with token...');
    const profileResponse = await axiosInstance.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Profile access successful!');
    console.log('User data:', profileResponse.data.data.user.username);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

testLogin();