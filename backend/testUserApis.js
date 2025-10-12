const axios = require('axios');

// First login to get a token
async function testUserApis() {
  try {
    // Login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test1@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('Login successful, token:', token);
    
    // Use the token to access protected endpoints
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    // Test getUserRequests
    try {
      const requestsResponse = await axios.get('http://localhost:5000/api/users/me/requests', config);
      console.log('Friend requests:', requestsResponse.data);
    } catch (error) {
      console.log('Error getting friend requests:', error.response?.data || error.message);
    }
    
    // Test getUserFriends
    try {
      const friendsResponse = await axios.get('http://localhost:5000/api/users/me/friends', config);
      console.log('Friends:', friendsResponse.data);
    } catch (error) {
      console.log('Error getting friends:', error.response?.data || error.message);
    }
  } catch (error) {
    console.log('Login failed:', error.response?.data || error.message);
  }
}

testUserApis();