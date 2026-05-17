const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log(`[protect] ${req.method} ${req.path} | authHeader: ${authHeader ? authHeader.substring(0, 30) + '...' : 'MISSING'}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[protect] REJECTED: no Bearer header');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[protect] token decoded, userId:', decoded.id);

    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      console.log('[protect] REJECTED: user not found in DB for id', decoded.id);
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    console.log('[protect] OK — user:', req.user.email, '| canSell:', req.user.capabilities?.canSell);
    return next();
  } catch (error) {
    console.log('[protect] REJECTED: token verify failed —', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
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