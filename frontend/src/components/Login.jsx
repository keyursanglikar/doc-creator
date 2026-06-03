import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Register from './Register';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Login = ({ onLogin }) => {
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/users/login`, { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      toast.success(`Welcome back ${user.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (showRegister) {
    return <Register onSwitchToLogin={() => setShowRegister(false)} onRegisterSuccess={onLogin} />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>📄 Collaborative Docs</h1>
        <p>Create, edit, and share documents with your team</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password-login"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="divider">
          <span>or</span>
        </div>
        
        <button 
          className="switch-auth"
          onClick={() => setShowRegister(true)}
        >
          Don't have an account? Sign Up
        </button>
      </div>
    </div>
  );
};

export default Login;