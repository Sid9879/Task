const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { blacklistToken } = require('../config/redis');


const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const userData = {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    team: user.team,
    createdAt: user.createdAt,
  };

  res.status(statusCode).json({ success: true, token, data: userData });
};


exports.register = async (req, res) => {
  try {

    const { username, email, password, team } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists',
      });
    }

   
    const user = await User.create({ username, email, password, team, role: 'User' });
    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
      return res.status(400).json({ success: false, error: 'Please provide email or username, and password' });
    }

  
    const query = email ? { email } : { username };
    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials or user not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.logout = async (req, res) => {
  try {
    const token = req.token;
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await blacklistToken(token, ttl);

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['Admin', 'Manager', 'User'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: { _id: user._id, username: user.username, isActive: user.isActive },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
