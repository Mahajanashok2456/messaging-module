const axios = require('axios');

async function testConnection() {
  try {
    const response = await axios.get('http://localhost:5000/');
    console.log('Backend is accessible:', response.data);
  } catch (error) {
    console.log('Error connecting to backend:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testConnection();