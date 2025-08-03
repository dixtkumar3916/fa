const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Tip = require('../models/Tip');
const Chat = require('../models/Chat');
const Crop = require('../models/Crop');
const Expense = require('../models/Expense');
const Sensor = require('../models/Sensor');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken, requireAdmin);

// Get admin dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalExperts,
      totalTips,
      totalCrops,
      totalExpenses,
      activeSensors,
      activeChats,
      recentUsers,
      recentTips
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'farmer', isActive: true }),
      User.countDocuments({ role: 'expert', isActive: true }),
      Tip.countDocuments({ status: 'published' }),
      Crop.countDocuments({ status: 'available' }),
      Expense.countDocuments(),
      Sensor.countDocuments({ status: 'active' }),
      Chat.countDocuments({ status: 'active' }),
      User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email role createdAt'),
      Tip.find({ status: 'published' })
        .populate('author', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title category views createdAt author')
    ]);

    // User registration trends (last 12 months)
    const userTrends = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const stats = {
      overview: {
        totalUsers,
        totalFarmers,
        totalExperts,
        totalTips,
        totalCrops,
        totalExpenses,
        activeSensors,
        activeChats
      },
      trends: {
        userRegistrations: userTrends
      },
      recent: {
        users: recentUsers,
        tips: recentTips
      }
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get dashboard stats', error: error.message });
  }
});

// User Management

// Get all users with filtering
router.get('/users', [
  query('role').optional().isIn(['farmer', 'expert', 'admin']),
  query('status').optional().isIn(['active', 'inactive']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (status) query.isActive = status === 'active';
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get users', error: error.message });
  }
});

// Get single user details
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user activity stats
    const stats = {};
    if (user.role === 'farmer') {
      stats.crops = await Crop.countDocuments({ farmer: user._id });
      stats.expenses = await Expense.countDocuments({ farmer: user._id });
      stats.sensors = await Sensor.countDocuments({ farmer: user._id });
      stats.chats = await Chat.countDocuments({ 'participants.user': user._id });
    } else if (user.role === 'expert') {
      stats.tips = await Tip.countDocuments({ author: user._id });
      stats.consultations = await Chat.countDocuments({ 
        'participants.user': user._id,
        'participants.role': 'expert'
      });
    }

    res.json({ user, stats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
});

// Update user status
router.put('/users/:id/status', [
  body('isActive').isBoolean().withMessage('Status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = req.body.isActive;
    await user.save();

    res.json({ message: 'User status updated successfully', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
});

// Verify expert
router.put('/users/:id/verify', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'expert') {
      return res.status(400).json({ message: 'Only experts can be verified' });
    }

    user.profile.verified = true;
    await user.save();

    res.json({ message: 'Expert verified successfully', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify expert', error: error.message });
  }
});

// Content Management

// Get all tips with filtering
router.get('/tips', [
  query('status').optional().isIn(['draft', 'published', 'archived']),
  query('category').optional().trim(),
  query('author').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      status,
      category,
      author,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (author) query.author = author;

    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      Tip.find(query)
        .populate('author', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Tip.countDocuments(query)
    ]);

    res.json({
      tips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get tips', error: error.message });
  }
});

// Update tip status
router.put('/tips/:id/status', [
  body('status').isIn(['draft', 'published', 'archived']).withMessage('Valid status required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tip = await Tip.findById(req.params.id);
    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }

    tip.status = req.body.status;
    await tip.save();

    res.json({ message: 'Tip status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update tip status', error: error.message });
  }
});

// Feature/unfeature tip
router.put('/tips/:id/feature', [
  body('featured').isBoolean().withMessage('Featured must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tip = await Tip.findById(req.params.id);
    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }

    tip.featured = req.body.featured;
    await tip.save();

    res.json({ 
      message: `Tip ${req.body.featured ? 'featured' : 'unfeatured'} successfully` 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update tip feature status', error: error.message });
  }
});

// Chat Management

// Get all chats with filtering
router.get('/chats', [
  query('status').optional().isIn(['active', 'resolved', 'closed', 'pending']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('category').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const skip = (page - 1) * limit;

    const [chats, total] = await Promise.all([
      Chat.find(query)
        .populate('participants.user', 'name email role')
        .populate('lastMessage.sender', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Chat.countDocuments(query)
    ]);

    res.json({
      chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chats', error: error.message });
  }
});

// System Analytics

// Get system analytics
router.get('/analytics', [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [
      userGrowth,
      contentStats,
      activityStats,
      topCategories
    ] = await Promise.all([
      User.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      Promise.all([
        Tip.countDocuments({ createdAt: { $gte: startDate } }),
        Crop.countDocuments({ createdAt: { $gte: startDate } }),
        Chat.countDocuments({ createdAt: { $gte: startDate } })
      ]),
      Promise.all([
        Tip.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, totalViews: { $sum: '$views' } } }
        ]),
        Chat.countDocuments({ 
          createdAt: { $gte: startDate },
          status: 'resolved'
        })
      ]),
      Tip.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    const analytics = {
      period,
      dateRange: { start: startDate, end: now },
      userGrowth,
      content: {
        newTips: contentStats[0],
        newCrops: contentStats[1],
        newChats: contentStats[2]
      },
      activity: {
        totalTipViews: activityStats[0][0]?.totalViews || 0,
        resolvedChats: activityStats[1]
      },
      topCategories
    };

    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get analytics', error: error.message });
  }
});

// System Settings

// Get system settings
router.get('/settings', async (req, res) => {
  try {
    // In a real app, these would be stored in a settings collection
    const settings = {
      general: {
        siteName: 'DigiFarm',
        maintenanceMode: false,
        registrationEnabled: true,
        maxFileSize: '10MB'
      },
      features: {
        chatEnabled: true,
        sensorIntegration: true,
        weatherAPI: true,
        reportGeneration: true
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      }
    };

    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get settings', error: error.message });
  }
});

// Update system settings
router.put('/settings', [
  body('general').optional().isObject(),
  body('features').optional().isObject(),
  body('notifications').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // In a real app, these would be saved to a settings collection
    const { general, features, notifications } = req.body;
    
    // Here you would update the settings in the database
    // For now, we'll just return a success message
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
});

// Bulk operations

// Bulk update user status
router.put('/users/bulk/status', [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array required'),
  body('isActive').isBoolean().withMessage('Status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userIds, isActive } = req.body;
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { isActive }
    );

    res.json({ 
      message: `Updated ${result.modifiedCount} users successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to bulk update users', error: error.message });
  }
});

// Export data
router.get('/export/:type', [
  query('format').isIn(['json', 'csv']).withMessage('Valid format required')
], async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'users':
        data = await User.find().select('-password');
        filename = 'users';
        break;
      case 'tips':
        data = await Tip.find().populate('author', 'name email');
        filename = 'tips';
        break;
      case 'chats':
        data = await Chat.find().populate('participants.user', 'name email');
        filename = 'chats';
        break;
      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.json"`);
      res.json(data);
    } else {
      // CSV export would require additional processing
      res.status(501).json({ message: 'CSV export not implemented yet' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to export data', error: error.message });
  }
});

module.exports = router;