const axios = require('axios');

// Test the login endpoint directly
async function testLogin() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test1@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Login failed!');
    console.log('Error:', error.response?.data || error.message);
  }
}

testLogin();