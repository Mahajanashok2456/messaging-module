import React, { useState } from 'react';
import axiosInstance from './utils/axiosInstance';
import './modern-styles.css';

const TestAuth = () => {
  const [result, setResult] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Generate a unique email and username each time with appropriate length
  const generateUniqueCredentials = () => {
    const timestamp = Date.now().toString().slice(-6); // Get last 6 digits
    const randomNum = Math.floor(Math.random() * 1000);
    return {
      email: `test_${timestamp}_${randomNum}@ex.com`,
      username: `user_${timestamp}_${randomNum}` // Keep under 30 characters
    };
  };

  const registerUser = async () => {
    setLoading(true);
    setResult('');
    
    const { email, username } = generateUniqueCredentials();
    
    try {
      const response = await axiosInstance.post('/auth/register', {
        username: username,
        email: email,
        password: 'password123'
      });
      
      const newToken = response.data.data.token;
      setToken(newToken);
      
      // Set the token in the axios instance
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setResult(`Registration successful! Token: ${newToken.substring(0, 20)}...`);
    } catch (error: any) {
      setResult(`Registration failed: ${error.response?.data?.message || error.message}`);
      console.error('Registration error:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      
      // Display detailed error in UI
      if (error.response?.data) {
        setResult(`Registration failed: ${JSON.stringify(error.response.data)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async () => {
    setLoading(true);
    setResult('');
    
    try {
      const response = await axiosInstance.post('/auth/login', {
        email: 'test@example.com', // Use our consistent test user
        password: 'password123'
      });
      
      const newToken = response.data.data.token;
      setToken(newToken);
      
      // Set the token in the axios instance
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setResult(`Login successful! Token: ${newToken.substring(0, 20)}...`);
    } catch (error: any) {
      setResult(`Login failed: ${error.response?.data?.message || error.message}`);
      console.error('Login error:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } finally {
      setLoading(false);
    }
  };

  const getProfile = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // Make sure we have a token
      if (!token) {
        setResult('No token available. Please register or login first.');
        setLoading(false);
        return;
      }
      
      const response = await axiosInstance.get('/auth/profile');
      setResult(`Profile request successful! User: ${response.data.data.user.username}`);
    } catch (error: any) {
      setResult(`Profile request failed: ${error.response?.data?.message || error.message}`);
      console.error('Profile error:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    setToken('');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setResult('Token cleared');
  };

  return (
    <div className="test-auth-container">
      <div className="test-auth-header">
        <h1 className="test-auth-title">Authentication Test</h1>
        <p className="test-auth-description">Test user registration, login, and profile access</p>
      </div>
      
      <div className="test-auth-buttons">
        <button 
          onClick={registerUser}
          disabled={loading}
          className="test-auth-button test-auth-button-primary"
        >
          {loading ? 'Registering...' : 'Register User'}
        </button>
        
        <button 
          onClick={loginUser}
          disabled={loading}
          className="test-auth-button test-auth-button-success"
        >
          {loading ? 'Logging in...' : 'Login User'}
        </button>
        
        <button 
          onClick={getProfile}
          disabled={loading}
          className="test-auth-button test-auth-button-info"
        >
          {loading ? 'Getting Profile...' : 'Get Profile'}
        </button>
        
        <button 
          onClick={clearToken}
          className="test-auth-button test-auth-button-danger"
        >
          Clear Token
        </button>
      </div>
      
      <div className="test-auth-token">
        <strong>Current Token:</strong> {token ? `${token.substring(0, 30)}...` : 'None'}
      </div>
      
      {result && (
        <div className={`test-auth-result ${result.includes('successful') ? 'test-auth-result-success' : 'test-auth-result-error'}`}>
          {result}
        </div>
      )}
    </div>
  );
};

export default TestAuth;