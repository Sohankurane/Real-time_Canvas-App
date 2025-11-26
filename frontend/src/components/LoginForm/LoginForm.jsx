import React from 'react';
import { useLoginForm } from './LoginForm.hook';
import './LoginForm.css';

const LoginForm = ({ onSuccess, onSwitch }) => {
  const {
    username,
    setUsername,
    password,
    setPassword,
    error,
    isLoading,
    handleSubmit
  } = useLoginForm(onSuccess);

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span role="img" aria-label="lock">🔒</span>
          </div>
          <h2>Welcome back</h2>
          <p>Please login to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input
              type="text"
              placeholder="Your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
              disabled={isLoading}
            />
          </label>
          
          <label>
            Password
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>
          
          {error && <div className="login-error">{error}</div>}
          
          <button 
            className="login-btn" 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-switch">
          Don't have an account?
          <button 
            className="link-btn" 
            onClick={onSwitch}
            disabled={isLoading}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
