const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

// REGISTER - Create new account (FIXED)
router.post('/register', async (req, res) => {
  console.log('Registration request received:', req.body);
  
  try {
    const { email, name, password } = req.body;
    
    // Detailed validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      name: name,
      password: password
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('User registered successfully:', user.email);
    
    // Return user data
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
    
  } catch (err) {
    console.error('Registration error details:', err);
    res.status(500).json({ 
      error: 'Registration failed',
      details: err.message 
    });
  }
});

// LOGIN - Authenticate user (FIXED)
router.post('/login', async (req, res) => {
  console.log('Login request received:', req.body.email);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('User logged in successfully:', user.email);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET all users (for sharing dropdown)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, 'name email _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;