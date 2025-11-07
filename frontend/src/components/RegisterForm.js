import React, { useState } from 'react';
import './LoginForm.css';

// Get API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const RegisterForm = ({ onSuccess, onSwitch }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Registration successful! Please login.');
        setTimeout(() => onSuccess && onSuccess(), 1000);
      } else {
        setError(typeof data.detail === 'string' ? data.detail : 'Registration failed');
      }
    } catch {
      setError('Network error');
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><span role="img" aria-label="register">📝</span></div>
          <h2>Create your account</h2>
          <p>Fill info to get started</p>
        </div>
        <form onSubmit={handleRegister} className="login-form">
          <label>
            Full Name
            <input
              type="text"
              placeholder="Your full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </label>
          <label>
            Username
            <input
              type="text"
              placeholder="Your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
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
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          {success && <div style={{ color: 'green', fontWeight: 500, textAlign: 'center', margin: '8px 0' }}>{success}</div>}
          <button type="submit" className="login-btn">Register</button>
        </form>
        <div className="login-switch">
          Already have an account?
          <button className="link-btn" onClick={onSwitch}>Login</button>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
