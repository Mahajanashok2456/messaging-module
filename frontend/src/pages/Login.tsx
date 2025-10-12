import React, { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../modern-styles.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const login = auth?.login || (() => Promise.resolve({ success: false, message: 'Auth not available' }));
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/home');
    } else {
      setError(result.message || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-card">
        <h2 className="auth-form-title">Sign in to your account</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-form-error">
              {error}
            </div>
          )}
          <div className="auth-form-group">
            <label htmlFor="email-address" className="auth-form-label">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="auth-form-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                // Email validation on blur
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (email && !emailRegex.test(email)) {
                  setError('Please enter a valid email address');
                } else {
                  setError('');
                }
              }}
            />
          </div>
          <div className="auth-form-group">
            <label htmlFor="password" className="auth-form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="auth-form-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-form-button"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <Link to="/register" className="auth-form-link">
          Don't have an account? Register here
        </Link>
      </div>
    </div>
  );
};

export default Login;