import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import axiosInstance from '../utils/axiosInstance';

interface User {
  _id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Checking authentication status');
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('connectly_token');
      console.log('AuthProvider: Token found:', token ? `${token.substring(0, 20)}...` : 'none');
      
      if (token) {
        // Validate token format
        if (!isValidJwtToken(token)) {
          console.log('AuthProvider: Invalid token format, clearing it');
          localStorage.removeItem('connectly_token');
          setLoading(false);
          return;
        }
        
        // Set the token in the axios instance for all requests
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verify token and get user data
        console.log('AuthProvider: Verifying token with backend');
        const response = await axiosInstance.get('/auth/profile');
        console.log('AuthProvider: Token verified, user data:', response.data);
        
        // The response structure is { status: 'success', data: { user: {...} } }
        setUser(response.data.data.user);
      } else {
        console.log('AuthProvider: No token found');
      }
    } catch (error: any) {
      console.error('AuthProvider: Error verifying token:', error);
      localStorage.removeItem('connectly_token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to validate JWT token format
  const isValidJwtToken = (token: string): boolean => {
    try {
      const parts = token.split('.');
      return parts.length === 3 && parts.every(part => /^[a-zA-Z0-9_-]+$/.test(part));
    } catch {
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/login', {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      
      // The response structure is { status: 'success', data: { user: {...}, token: '...' } }
      const { token, user: userData } = response.data.data;
      
      // Store token in localStorage
      localStorage.setItem('connectly_token', token);
      
      // Set the token in the axios instance for future requests
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Update user state
      setUser(userData);
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      
      // Clear any invalid token
      localStorage.removeItem('connectly_token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      setUser(null);
      
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Login failed' 
      };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/register', {
        username,
        email,
        password
      });
      
      console.log('Register response:', response.data);
      
      // The response structure is { status: 'success', data: { user: {...}, token: '...' } }
      const { token, user: userData } = response.data.data;
      
      // Store token in localStorage
      localStorage.setItem('connectly_token', token);
      
      // Set the token in the axios instance for future requests
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Update user state
      setUser(userData);
      
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      
      // Clear any invalid token
      localStorage.removeItem('connectly_token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      setUser(null);
      
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('connectly_token');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};