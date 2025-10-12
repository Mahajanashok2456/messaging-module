import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../modern-styles.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const register = auth?.register || (() => Promise.resolve({ success: false, message: 'Auth not available' }));
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');

    const result = await register(username, email, password);
    
    if (result.success) {
      navigate('/home');
    } else {
      setError(result.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-card">
        <h2 className="auth-form-title">Create a new account</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-form-error">
              {error}
            </div>
          )}
          <div className="auth-form-group">
            <label htmlFor="username" className="auth-form-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="auth-form-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
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
              required
              className="auth-form-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="auth-form-group">
            <label htmlFor="confirm-password" className="auth-form-label">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              className="auth-form-input"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-form-button"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <Link to="/login" className="auth-form-link">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
};

export default Register;