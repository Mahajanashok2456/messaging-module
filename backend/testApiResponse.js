require('dotenv').config();
const axios = require('axios');

// Test the API response format
const testApiResponse = async () => {
  const baseURL = 'http://localhost:5000/api';
  const axiosInstance = axios.create({ baseURL });
  
  try {
    console.log('=== Testing API Response Format ===\n');
    
    // Register a new user to get a token
    console.log('1. Registering user...');
    const registerResponse = await axiosInstance.post('/auth/register', {
      username: 'api_test_user',
      email: 'api_test@example.com',
      password: 'password123'
    });
    
    console.log('Registration response structure:');
    console.log('Status:', registerResponse.status);
    console.log('Data keys:', Object.keys(registerResponse.data));
    console.log('Data.data keys:', Object.keys(registerResponse.data.data));
    
    const token = registerResponse.data.data.token;
    
    // Test profile response structure
    console.log('\n2. Profile response structure:');
    const profileResponse = await axiosInstance.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Profile response status:', profileResponse.status);
    console.log('Profile data keys:', Object.keys(profileResponse.data));
    console.log('Profile data.data keys:', Object.keys(profileResponse.data.data));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

testApiResponse();