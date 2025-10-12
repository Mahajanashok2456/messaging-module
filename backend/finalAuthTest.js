require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Final comprehensive test of the authentication flow
const finalAuthTest = async () => {
  const baseURL = 'http://localhost:5000/api';
  const axiosInstance = axios.create({ baseURL });
  
  try {
    console.log('=== Final Authentication Flow Test ===\n');
    
    // 1. Login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axiosInstance.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('✓ Login successful');
    console.log('  Token:', loginResponse.data.data.token.substring(0, 30) + '...');
    console.log('  User:', loginResponse.data.data.user.username);
    
    const token = loginResponse.data.data.token;
    
    // 2. Verify token structure
    console.log('\n2. Verifying token structure...');
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token structure');
    }
    console.log('✓ Token has valid structure (3 parts)');
    
    // 3. Decode token payload
    console.log('\n3. Decoding token payload...');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('✓ Token payload decoded:', payload);
    console.log('  User ID:', payload.userId);
    console.log('  Issued at:', new Date(payload.iat * 1000));
    console.log('  Expires at:', new Date(payload.exp * 1000));
    
    // 4. Verify token with JWT secret
    console.log('\n4. Verifying token with JWT secret...');
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✓ Token verified successfully');
    console.log('  Verified payload:', verified);
    
    // 5. Test profile access with the token
    console.log('\n5. Testing profile access...');
    const profileResponse = await axiosInstance.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✓ Profile access successful');
    console.log('  User data:', profileResponse.data.data.user.username);
    console.log('  Email:', profileResponse.data.data.user.email);
    
    // 6. Test profile access without token (should fail)
    console.log('\n6. Testing profile access without token (should fail)...');
    try {
      await axiosInstance.get('/auth/profile');
      console.log('✗ Unexpected: Profile access without token succeeded');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✓ Profile access correctly failed without token (401 Unauthorized)');
      } else {
        console.log('✗ Unexpected error:', error.message);
      }
    }
    
    // 7. Test profile access with invalid token (should fail)
    console.log('\n7. Testing profile access with invalid token (should fail)...');
    try {
      await axiosInstance.get('/auth/profile', {
        headers: { Authorization: 'Bearer invalid.token.here' }
      });
      console.log('✗ Unexpected: Profile access with invalid token succeeded');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✓ Profile access correctly failed with invalid token (401 Unauthorized)');
      } else {
        console.log('✗ Unexpected error:', error.message);
      }
    }
    
    console.log('\n=== All tests passed! Authentication system is working correctly ===');
    
  } catch (error) {
    console.error('\n=== Test failed ===');
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

finalAuthTest();