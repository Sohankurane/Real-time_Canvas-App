import React, { useState } from 'react';
import './LoginForm.css';

const LoginForm = ({ onSuccess, onSwitch }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, username, password })
      });
      const data = await res.json();
      if (res.ok) {
        // Save JWT token for later use!
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
        }
        onSuccess && onSuccess({ fullName, username });
      } else {
        setError(typeof data.detail === 'string' ? data.detail : 'Login failed');
      }
    } catch {
      setError('Network error, try again.');
    }
  };

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
        <form onSubmit={handleLogin} className="login-form">
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
              autoFocus
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
          <button className="login-btn" type="submit">Login</button>
        </form>
        <div className="login-switch">
          Don't have an account?
          <button className="link-btn" onClick={onSwitch}>Register</button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
