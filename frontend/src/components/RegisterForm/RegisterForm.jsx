import React from 'react';
import { useRegisterForm } from './RegisterForm.hook';
import './RegisterForm.css';

const RegisterForm = ({ onSuccess, onSwitch }) => {
  const {
    fullName,
    setFullName,
    username,
    setUsername,
    password,
    setPassword,
    error,
    success,
    isLoading,
    handleSubmit
  } = useRegisterForm(onSuccess);

  return (
    <div className="register-bg">
      <div className="register-card">
        <div className="register-header">
          <div className="register-logo">
            <span role="img" aria-label="user">👤</span>
          </div>
          <h2>Create Account</h2>
          <p>Join us to start collaborating</p>
        </div>
        
        <form onSubmit={handleSubmit} className="register-form">
          <label>
            Full Name
            <input
              type="text"
              placeholder="Your full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              autoFocus
              required
              disabled={isLoading}
            />
          </label>
          
          <label>
            Username
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>
          
          <label>
            Password
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>
          
          {error && <div className="register-error">{error}</div>}
          {success && <div className="register-success">{success}</div>}
          
          <button 
            className="register-btn" 
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        
        <div className="register-switch">
          Already have an account?
          <button 
            className="link-btn" 
            onClick={onSwitch}
            disabled={isLoading}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
