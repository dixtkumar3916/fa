const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Token verification failed' });
  }
};

// Check if user has required role
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
};

// Check if user is farmer
const requireFarmer = authorizeRole('farmer');

// Check if user is expert
const requireExpert = authorizeRole('expert');

// Check if user is admin
const requireAdmin = authorizeRole('admin');

// Check if user is expert or admin
const requireExpertOrAdmin = authorizeRole('expert', 'admin');

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }
  next();
};

// Check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return next(); // Admins can access everything
      }

      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Check if user owns the resource
      const ownerId = resource.farmer || resource.user || resource.author;
      if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied - not resource owner' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Authorization check failed' });
    }
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
  requireFarmer,
  requireExpert,
  requireAdmin,
  requireExpertOrAdmin,
  optionalAuth,
  requireOwnershipOrAdmin
};