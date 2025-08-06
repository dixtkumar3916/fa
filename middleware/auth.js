const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
const auth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          message: 'User not found'
        });
      }

      // Check if user is active
      if (!req.user.isActive) {
        return res.status(401).json({
          message: 'Account is deactivated'
        });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      message: 'Not authorized, no token'
    });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// Specific role middleware
const authorizeFarmer = authorize('farmer');
const authorizeExpert = authorize('expert');
const authorizeAdmin = authorize('admin');
const authorizeExpertOrAdmin = authorize('expert', 'admin');

// Optional authentication (for public routes that can show different content for logged-in users)
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token is invalid, but we don't block the request
      console.error('Optional auth error:', error);
    }
  }

  next();
};

// Check if user owns the resource or is admin
const checkOwnership = (model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          message: 'Resource not found'
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // Check if user owns the resource
      const ownerField = resource.owner ? 'owner' : 'farmer';
      if (resource[ownerField].toString() === req.user._id.toString()) {
        req.resource = resource;
        return next();
      }

      // For experts, check if they're assigned to the farmer
      if (req.user.role === 'expert' && resource.farmer) {
        const farmer = await User.findById(resource.farmer);
        if (farmer && farmer.farmer && farmer.farmer.assignedExpert) {
          if (farmer.farmer.assignedExpert.toString() === req.user._id.toString()) {
            req.resource = resource;
            return next();
          }
        }
      }

      return res.status(403).json({
        message: 'Not authorized to access this resource'
      });
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        message: 'Server error'
      });
    }
  };
};

// Rate limiting for sensitive operations
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      message: message || 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific rate limiters
const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many login attempts, please try again in 15 minutes'
);

const registerLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  'Too many registration attempts, please try again in 1 hour'
);

const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  'Too many password reset attempts, please try again in 1 hour'
);

// Check if user can access chat
const checkChatAccess = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const Chat = require('../models/Chat');
    
    const chat = await Chat.findOne({ chatId });
    
    if (!chat) {
      return res.status(404).json({
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(p => 
      p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Not authorized to access this chat'
      });
    }

    req.chat = chat;
    next();
  } catch (error) {
    console.error('Chat access check error:', error);
    return res.status(500).json({
      message: 'Server error'
    });
  }
};

// Check if user can access equipment booking
const checkBookingAccess = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const EquipmentBooking = require('../models/EquipmentBooking');
    
    const booking = await EquipmentBooking.findOne({ bookingId })
      .populate('farmer', 'name')
      .populate('owner', 'name');
    
    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    // Check if user is involved in the booking
    const isFarmer = booking.farmer._id.toString() === req.user._id.toString();
    const isOwner = booking.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isFarmer && !isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'Not authorized to access this booking'
      });
    }

    req.booking = booking;
    next();
  } catch (error) {
    console.error('Booking access check error:', error);
    return res.status(500).json({
      message: 'Server error'
    });
  }
};

module.exports = {
  auth,
  authorize,
  authorizeFarmer,
  authorizeExpert,
  authorizeAdmin,
  authorizeExpertOrAdmin,
  optionalAuth,
  checkOwnership,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  checkChatAccess,
  checkBookingAccess
};