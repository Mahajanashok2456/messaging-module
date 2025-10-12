import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TestLoginFlow = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const navigate = useNavigate();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    
    const loginResult = await auth?.login(email, password);
    
    if (loginResult?.success) {
      setResult('Login successful!');
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/home');
      }, 1000);
    } else {
      setResult(`Login failed: ${loginResult?.message || 'Unknown error'}`);
    }
    
    setLoading(false);
  };
  
  const handleLogout = () => {
    auth?.logout();
    setResult('Logged out successfully');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Test Login Flow
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {result && (
            <div className={`rounded-md p-4 ${result.includes('successful') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="text-sm">
                {result}
              </div>
            </div>
          )}
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
              onClick={handleLogout}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestLoginFlow;