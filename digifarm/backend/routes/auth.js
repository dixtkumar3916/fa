const express = require('express');
const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const Expert = require('../models/Expert');
const { farmerAuth, expertAuth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET || 'digifarm_secret_key',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/farmer/register
// @desc    Register farmer
// @access  Public
router.post('/farmer/register', async (req, res) => {
  try {
    const { name, email, password, mobile, location, farmDetails } = req.body;

    // Check if farmer already exists
    const existingFarmer = await Farmer.findOne({ email });
    if (existingFarmer) {
      return res.status(400).json({ message: 'Farmer already exists with this email' });
    }

    // Create new farmer
    const farmer = new Farmer({
      name,
      email,
      password,
      mobile,
      location,
      farmDetails
    });

    await farmer.save();

    // Generate token
    const token = generateToken(farmer._id, 'farmer');

    res.status(201).json({
      message: 'Farmer registered successfully',
      token,
      farmer: {
        id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        mobile: farmer.mobile,
        location: farmer.location,
        farmDetails: farmer.farmDetails
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/farmer/login
// @desc    Login farmer
// @access  Public
router.post('/farmer/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if farmer exists
    const farmer = await Farmer.findOne({ email });
    if (!farmer) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await farmer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    farmer.lastLogin = new Date();
    await farmer.save();

    // Generate token
    const token = generateToken(farmer._id, 'farmer');

    res.json({
      message: 'Login successful',
      token,
      farmer: {
        id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        mobile: farmer.mobile,
        location: farmer.location,
        farmDetails: farmer.farmDetails
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/expert/register
// @desc    Register expert
// @access  Public
router.post('/expert/register', async (req, res) => {
  try {
    const { name, email, password, mobile, specialization, qualifications, experience, location } = req.body;

    // Check if expert already exists
    const existingExpert = await Expert.findOne({ email });
    if (existingExpert) {
      return res.status(400).json({ message: 'Expert already exists with this email' });
    }

    // Create new expert
    const expert = new Expert({
      name,
      email,
      password,
      mobile,
      specialization,
      qualifications,
      experience,
      location
    });

    await expert.save();

    // Generate token
    const token = generateToken(expert._id, 'expert');

    res.status(201).json({
      message: 'Expert registered successfully',
      token,
      expert: {
        id: expert._id,
        name: expert.name,
        email: expert.email,
        mobile: expert.mobile,
        specialization: expert.specialization,
        qualifications: expert.qualifications,
        experience: expert.experience,
        location: expert.location
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/expert/login
// @desc    Login expert
// @access  Public
router.post('/expert/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if expert exists
    const expert = await Expert.findOne({ email });
    if (!expert) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await expert.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(expert._id, 'expert');

    res.json({
      message: 'Login successful',
      token,
      expert: {
        id: expert._id,
        name: expert.name,
        email: expert.email,
        mobile: expert.mobile,
        specialization: expert.specialization,
        qualifications: expert.qualifications,
        experience: expert.experience,
        location: expert.location
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/farmer/profile
// @desc    Get farmer profile
// @access  Private
router.get('/farmer/profile', farmerAuth, async (req, res) => {
  try {
    res.json({
      farmer: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        mobile: req.user.mobile,
        location: req.user.location,
        farmDetails: req.user.farmDetails,
        profile: req.user.profile
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/farmer/profile
// @desc    Update farmer profile
// @access  Private
router.put('/farmer/profile', farmerAuth, async (req, res) => {
  try {
    const updates = req.body;
    const farmer = await Farmer.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      farmer
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;