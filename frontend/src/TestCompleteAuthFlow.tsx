import React, { useState } from 'react';
import axiosInstance from './utils/axiosInstance';

const TestCompleteAuthFlow = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    
    try {
      console.log('Attempting login with:', { email, password });
      const response = await axiosInstance.post('/auth/login', {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      const { token: newToken, user } = response.data.data;
      
      setToken(newToken);
      localStorage.setItem('connectly_token', newToken);
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setResult(`Login successful! Welcome ${user.username}`);
    } catch (error: any) {
      console.error('Login error:', error);
      setResult(`Login failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileRequest = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // Ensure token is set in axios instance
      const storedToken = localStorage.getItem('connectly_token');
      if (storedToken) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      
      console.log('Making profile request...');
      const response = await axiosInstance.get('/auth/profile');
      console.log('Profile response:', response.data);
      
      setResult(`Profile request successful! User: ${response.data.data.user.username}`);
    } catch (error: any) {
      console.error('Profile error:', error);
      setResult(`Profile request failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('connectly_token');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setToken('');
    setResult('Logged out successfully');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Auth Flow Test
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Test the complete authentication flow
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            
            <button
              type="button"
              onClick={handleProfileRequest}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Getting Profile...' : 'Get Profile'}
            </button>
            
            <button
              type="button"
              onClick={handleLogout}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </form>
        
        <div className="mt-4">
          <p><strong>Current Token:</strong> {token ? `${token.substring(0, 30)}...` : 'None'}</p>
        </div>
        
        {result && (
          <div className={`rounded-md p-4 ${result.includes('successful') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <div className="text-sm">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestCompleteAuthFlow;