const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check if the request has an authorization header that starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (Format is "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token payload (we signed it with the user's ID earlier)
      // .select('-password') ensures we don't pass the hashed password along
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Pass control to the next middleware or controller
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to check if user has specific capability
const requireCapability = (capability) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user' });
    }

    // Admin bypass - admins have all capabilities
    if (req.user.isAdmin) {
      return next();
    }

    // Check if user has the required capability
    const capabilities = req.user.capabilities || {};
    if (!capabilities[capability]) {
      return res.status(403).json({
        message: `Access denied. This feature requires ${capability} capability.`,
        requiredCapability: capability,
        currentCapabilities: capabilities,
      });
    }

    next();
  };
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  next();
};

// Middleware to check multiple capabilities (any one of them)
const requireAnyCapability = (...capabilities) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user' });
    }

    // Admin bypass
    if (req.user.isAdmin) {
      return next();
    }

    const userCapabilities = req.user.capabilities || {};
    const hasAnyCapability = capabilities.some(cap => userCapabilities[cap]);

    if (!hasAnyCapability) {
      return res.status(403).json({
        message: `Access denied. Requires one of: ${capabilities.join(', ')}`,
        requiredCapabilities: capabilities,
        currentCapabilities: userCapabilities,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  requireCapability,
  requireAdmin,
  requireAnyCapability,
};