const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/email');
const sendSMS = require('../utils/sms');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user (farmer, expert, or admin)
// @access  Public
router.post('/register', [
  body('name', 'Name is required').notEmpty().trim(),
  body('email', 'Please include a valid email').isEmail().normalizeEmail(),
  body('phone', 'Phone number is required').notEmpty().trim(),
  body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  body('role', 'Role must be farmer, expert, or admin').isIn(['farmer', 'expert', 'admin']),
  body('address.city', 'City is required').notEmpty(),
  body('address.state', 'State is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, role, address, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered'
      });
    }

    // Create user object
    const userData = {
      name,
      email,
      phone,
      password,
      role,
      address,
      location: location || {
        type: 'Point',
        coordinates: [0, 0]
      }
    };

    // Add role-specific data
    if (role === 'farmer') {
      userData.farmer = {
        farmSize: req.body.farmSize || 0,
        farmType: req.body.farmType || 'conventional',
        primaryCrops: req.body.primaryCrops || [],
        experience: req.body.experience || 0
      };
    } else if (role === 'expert') {
      userData.expert = {
        specialization: req.body.specialization || [],
        qualification: req.body.qualification || '',
        experience: req.body.experience || 0,
        certification: req.body.certification || []
      };
    } else if (role === 'admin') {
      userData.admin = {
        permissions: req.body.permissions || ['read'],
        department: req.body.department || 'general',
        accessLevel: req.body.accessLevel || 'support'
      };
    }

    // Create user
    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Agro Connect',
        template: 'welcome',
        data: {
          name: user.name,
          role: user.role
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Send welcome SMS
    try {
      await sendSMS({
        to: user.phone,
        message: `Welcome to Agro Connect! Your account has been created successfully. Your role: ${user.role}`
      });
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('identifier', 'Email or phone is required').notEmpty(),
  body('password', 'Password is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body;

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('farmer.assignedExpert', 'name email phone')
      .populate('expert.assignedFarmers', 'name email phone');

    res.json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, address, location, preferences } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update basic fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };
    if (location) user.location = location;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    // Update role-specific fields
    if (user.role === 'farmer' && req.body.farmer) {
      user.farmer = { ...user.farmer, ...req.body.farmer };
    } else if (user.role === 'expert' && req.body.expert) {
      user.expert = { ...user.expert, ...req.body.expert };
    } else if (user.role === 'admin' && req.body.admin) {
      user.admin = { ...user.admin, ...req.body.admin };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      message: 'Server error during profile update'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email/SMS
// @access  Public
router.post('/forgot-password', [
  body('identifier', 'Email or phone is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ]
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send reset email
    if (user.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Password Reset Request',
          template: 'password-reset',
          data: {
            name: user.name,
            resetToken,
            resetUrl: `${process.env.CLIENT_URL}/reset-password/${resetToken}`
          }
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    // Send reset SMS
    if (user.phone) {
      try {
        await sendSMS({
          to: user.phone,
          message: `Your password reset code is: ${resetToken}. Valid for 10 minutes.`
        });
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
      }
    }

    res.json({
      success: true,
      message: 'Password reset instructions sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token', 'Reset token is required').notEmpty(),
  body('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new token
    const newToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful',
      token: newToken
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email address
// @access  Private
router.post('/verify-email', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email already verified'
      });
    }

    // Generate verification token
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await user.save();

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email',
        template: 'email-verification',
        data: {
          name: user.name,
          verificationToken,
          verificationUrl: `${process.env.CLIENT_URL}/verify-email/${verificationToken}`
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Verification email sent'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/confirm-email
// @desc    Confirm email verification
// @access  Public
router.post('/confirm-email', [
  body('token', 'Verification token is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email confirmation error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // In a more complex setup, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

module.exports = router;