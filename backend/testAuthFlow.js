require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Test the complete authentication flow
const testAuthFlow = async () => {
  const baseURL = 'http://localhost:5000/api';
  const axiosInstance = axios.create({ baseURL });
  
  try {
    console.log('=== Testing Authentication Flow ===\n');
    
    // 1. Register a new user
    console.log('1. Registering new user...');
    const registerResponse = await axiosInstance.post('/auth/register', {
      username: 'test_user_' + Date.now(),
      email: `test_${Date.now()}@example.com`,
      password: 'password123'
    });
    
    console.log('Registration successful!');
    console.log('Token:', registerResponse.data.data.token.substring(0, 30) + '...');
    console.log('User:', registerResponse.data.data.user.username);
    
    const token = registerResponse.data.data.token;
    
    // 2. Test profile access with the token
    console.log('\n2. Testing profile access with token...');
    const profileResponse = await axiosInstance.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Profile access successful!');
    console.log('User data:', profileResponse.data.data.user.username);
    
    // 3. Decode token to check its contents
    console.log('\n3. Decoding token...');
    const decoded = jwt.decode(token);
    console.log('Token payload:', decoded);
    console.log('Expiration:', new Date(decoded.exp * 1000));
    
    // 4. Test login with the same credentials
    console.log('\n4. Testing login...');
    const loginResponse = await axiosInstance.post('/auth/login', {
      email: registerResponse.data.data.user.email,
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('New token:', loginResponse.data.data.token.substring(0, 30) + '...');
    
    // 5. Test profile access with the new token
    console.log('\n5. Testing profile access with new token...');
    const newProfileResponse = await axiosInstance.get('/auth/profile', {
      headers: { Authorization: `Bearer ${loginResponse.data.data.token}` }
    });
    
    console.log('Profile access with new token successful!');
    console.log('User data:', newProfileResponse.data.data.user.username);
    
    console.log('\n=== All tests passed! ===');
    
  } catch (error) {
    console.error('\n=== Test failed ===');
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

testAuthFlow();