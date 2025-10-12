import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api', // Point directly to backend API
});

// Add request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Log the request details
    console.log('Axios Request:', config.method?.toUpperCase(), config.url);
    
    // Get token from localStorage
    const token = localStorage.getItem('connectly_token');
    
    // If token exists, attach it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token attached to request:', `${token.substring(0, 20)}...`);
    } else {
      console.log('No token found in localStorage for this request');
    }
    
    return config;
  },
  (error) => {
    console.error('Axios Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log('Axios Response:', response.status, response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  (error) => {
    // Log error responses
    console.error('Axios Response Error:', error.response?.status, error.response?.config.method?.toUpperCase(), error.response?.config.url);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      
      // If we get a 401 Unauthorized, clear the token
      if (error.response.status === 401) {
        console.log('401 Unauthorized received, clearing token from localStorage');
        localStorage.removeItem('connectly_token');
        delete axiosInstance.defaults.headers.common['Authorization'];
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;