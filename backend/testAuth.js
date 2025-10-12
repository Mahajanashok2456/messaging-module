const axios = require('axios');

async function testAuthFlow() {
  try {
    console.log('Testing authentication flow...');
    
    // 1. Register a new user
    console.log('1. Registering a new user...');
    const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
      username: 'testuser_auth',
      email: 'test_auth@example.com',
      password: 'password123'
    });
    
    console.log('Registration successful!');
    console.log('Token:', registerResponse.data.data.token);
    
    // 2. Login with the same user
    console.log('2. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test_auth@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    const token = loginResponse.data.data.token;
    console.log('Token:', token);
    
    // 3. Test profile endpoint with the token
    console.log('3. Testing profile endpoint...');
    const profileResponse = await axios.get('http://localhost:5000/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Profile request successful!');
    console.log('User data:', profileResponse.data.data.user);
    
    // 4. Test with axios instance directly
    console.log('4. Testing with axios instance...');
    const axiosInstance = axios.create({
      baseURL: 'http://localhost:5000/api'
    });
    
    // Set the token in the axios instance
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const profileResponse2 = await axiosInstance.get('/auth/profile');
    console.log('Profile request with axios instance successful!');
    console.log('User data:', profileResponse2.data.data.user);
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Error during authentication flow test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testAuthFlow();