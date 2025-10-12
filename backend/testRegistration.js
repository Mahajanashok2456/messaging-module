require('dotenv').config();
const axios = require('axios');

// Test registration
const testRegistration = async () => {
  try {
    console.log('Testing registration...');
    
    // Generate unique credentials with shorter names
    const timestamp = Date.now().toString().slice(-6); // Get last 6 digits
    const randomNum = Math.floor(Math.random() * 1000);
    const email = `test_${timestamp}_${randomNum}@ex.com`;
    const username = `user_${timestamp}_${randomNum}`; // Shorter username
    
    console.log(`Attempting to register: ${username} (${email})`);
    
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      username: username,
      email: email,
      password: 'password123'
    });
    
    console.log('Registration successful!');
    console.log('Response:', response.data);
    
    // Test login with the same credentials
    console.log('\nTesting login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: email,
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token:', loginResponse.data.data.token.substring(0, 20) + '...');
    
    // Test profile access
    console.log('\nTesting profile access...');
    const profileResponse = await axios.get('http://localhost:5000/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.data.token}`
      }
    });
    
    console.log('Profile access successful!');
    console.log('User:', profileResponse.data.data.user.username);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

testRegistration();