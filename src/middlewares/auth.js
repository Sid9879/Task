const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isTokenBlacklisted } = require('../config/redis');


exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: 'Not authorised to access this route' });
  }

  try {
    
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res
        .status(401)
        .json({ success: false, error: 'Token has been invalidated. Please log in again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ success: false, error: 'User not found or deactivated' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: 'Not authorised to access this route' });
  }
};


exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Role '${req.user.role}' is not authorised to access this route`,
      });
    }
    next();
  };
};
