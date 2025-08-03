const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const Expert = require('../models/Expert');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'digifarm_secret_key');
    
    // Check if it's a farmer or expert
    let user;
    if (decoded.userType === 'farmer') {
      user = await Farmer.findById(decoded.userId).select('-password');
    } else if (decoded.userType === 'expert') {
      user = await Expert.findById(decoded.userId).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    req.userType = decoded.userType;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const farmerAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'digifarm_secret_key');
    
    if (decoded.userType !== 'farmer') {
      return res.status(403).json({ message: 'Access denied. Farmers only.' });
    }

    const farmer = await Farmer.findById(decoded.userId).select('-password');
    
    if (!farmer) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = farmer;
    req.userType = 'farmer';
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const expertAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'digifarm_secret_key');
    
    if (decoded.userType !== 'expert') {
      return res.status(403).json({ message: 'Access denied. Experts only.' });
    }

    const expert = await Expert.findById(decoded.userId).select('-password');
    
    if (!expert) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = expert;
    req.userType = 'expert';
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { auth, farmerAuth, expertAuth };