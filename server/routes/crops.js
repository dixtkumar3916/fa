const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireFarmer, optionalAuth } = require('../middleware/auth');
const Crop = require('../models/Crop');
const User = require('../models/User');

const router = express.Router();

// Get all crops (public with optional auth for personalized results)
router.get('/', optionalAuth, [
  query('category').optional().isIn(['grains', 'vegetables', 'fruits', 'pulses', 'spices', 'cash_crops', 'other']),
  query('status').optional().isIn(['available', 'sold', 'reserved', 'expired']),
  query('organic').optional().isBoolean(),
  query('location').optional().trim(),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['price', 'date', 'name', 'distance']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      category,
      status = 'available',
      organic,
      location,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    // Build query
    const query = { status };
    
    if (category) query.category = category;
    if (organic !== undefined) query['quality.organic'] = organic === 'true';
    if (location) {
      query.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.state': new RegExp(location, 'i') },
        { 'location.address': new RegExp(location, 'i') }
      ];
    }
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort
    const sort = {};
    switch (sortBy) {
      case 'price':
        sort['price.value'] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'name':
        sort.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'date':
      default:
        sort.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
    }

    const skip = (page - 1) * limit;

    const [crops, total] = await Promise.all([
      Crop.find(query)
        .populate('farmer', 'name profile.location.city profile.verified')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Crop.countDocuments(query)
    ]);

    // Increment view count for viewed crops (if user is authenticated)
    if (req.user && crops.length > 0) {
      const cropIds = crops.map(crop => crop._id);
      await Crop.updateMany(
        { _id: { $in: cropIds } },
        { $inc: { views: 1 } }
      );
    }

    res.json({
      crops,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        categories: await Crop.distinct('category', { status: 'available' }),
        locations: await Crop.distinct('location.city', { status: 'available' })
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get crops', error: error.message });
  }
});

// Get single crop by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id)
      .populate('farmer', 'name mobile profile')
      .populate('inquiries.buyer', 'name mobile');

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Increment view count
    crop.views += 1;
    await crop.save();

    // Get similar crops
    const similarCrops = await Crop.find({
      _id: { $ne: crop._id },
      category: crop.category,
      status: 'available',
      'location.state': crop.location.state
    })
    .limit(4)
    .select('name price quantity location images')
    .populate('farmer', 'name profile.location.city');

    res.json({ 
      crop,
      similarCrops,
      canContact: req.user && req.user._id.toString() !== crop.farmer._id.toString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get crop', error: error.message });
  }
});

// Create new crop listing
router.post('/', authenticateToken, requireFarmer, [
  body('name').trim().notEmpty().withMessage('Crop name is required'),
  body('category').isIn(['grains', 'vegetables', 'fruits', 'pulses', 'spices', 'cash_crops', 'other']),
  body('quantity.value').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('quantity.unit').isIn(['kg', 'quintal', 'ton', 'piece', 'dozen', 'bag']),
  body('price.value').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('price.unit').isIn(['per_kg', 'per_quintal', 'per_ton', 'per_piece', 'per_dozen', 'per_bag', 'total']),
  body('harvestDate').isISO8601().withMessage('Valid harvest date required'),
  body('availableUntil').isISO8601().withMessage('Valid availability end date required'),
  body('location.city').trim().notEmpty().withMessage('City is required'),
  body('location.state').trim().notEmpty().withMessage('State is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const cropData = {
      ...req.body,
      farmer: req.user._id
    };

    const crop = new Crop(cropData);
    await crop.save();

    await crop.populate('farmer', 'name profile.location.city');

    res.status(201).json({
      message: 'Crop listed successfully',
      crop
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create crop listing', error: error.message });
  }
});

// Update crop listing
router.put('/:id', authenticateToken, requireFarmer, [
  body('name').optional().trim().notEmpty(),
  body('quantity.value').optional().isFloat({ min: 0 }),
  body('price.value').optional().isFloat({ min: 0 }),
  body('description').optional().isLength({ max: 1000 }),
  body('status').optional().isIn(['available', 'sold', 'reserved', 'expired'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Check ownership
    if (crop.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this crop' });
    }

    Object.assign(crop, req.body);
    await crop.save();

    await crop.populate('farmer', 'name profile.location.city');

    res.json({
      message: 'Crop updated successfully',
      crop
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update crop', error: error.message });
  }
});

// Delete crop listing
router.delete('/:id', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Check ownership
    if (crop.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this crop' });
    }

    await Crop.findByIdAndDelete(req.params.id);

    res.json({ message: 'Crop deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete crop', error: error.message });
  }
});

// Get farmer's own crops
router.get('/farmer/my-crops', authenticateToken, requireFarmer, [
  query('status').optional().isIn(['available', 'sold', 'reserved', 'expired']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { farmer: req.user._id };
    
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [crops, total] = await Promise.all([
      Crop.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Crop.countDocuments(query)
    ]);

    res.json({
      crops,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get your crops', error: error.message });
  }
});

// Send inquiry about a crop
router.post('/:id/inquire', authenticateToken, [
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('contactInfo.phone').optional().trim(),
  body('contactInfo.email').optional().isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Can't inquire about own crop
    if (crop.farmer.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot inquire about your own crop' });
    }

    // Check if already inquired
    const existingInquiry = crop.inquiries.find(
      inquiry => inquiry.buyer.toString() === req.user._id.toString()
    );

    if (existingInquiry) {
      return res.status(400).json({ message: 'You have already inquired about this crop' });
    }

    const inquiry = {
      buyer: req.user._id,
      message: req.body.message,
      contactInfo: req.body.contactInfo || {
        phone: req.user.mobile,
        email: req.user.email
      }
    };

    crop.inquiries.push(inquiry);
    await crop.save();

    // Populate the new inquiry
    await crop.populate('inquiries.buyer', 'name mobile');

    // Send notification to farmer (Socket.io)
    const io = req.app.get('io');
    io.to(`farmer-${crop.farmer}`).emit('new-inquiry', {
      cropId: crop._id,
      cropName: crop.name,
      buyerName: req.user.name,
      message: req.body.message
    });

    res.json({
      message: 'Inquiry sent successfully',
      inquiry: crop.inquiries[crop.inquiries.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send inquiry', error: error.message });
  }
});

// Get inquiries for farmer's crops
router.get('/farmer/inquiries', authenticateToken, requireFarmer, [
  query('status').optional().isIn(['pending', 'responded', 'closed']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const matchQuery = { farmer: req.user._id };
    const inquiryMatch = {};
    if (status) inquiryMatch['inquiries.status'] = status;

    const crops = await Crop.aggregate([
      { $match: matchQuery },
      { $unwind: '$inquiries' },
      { $match: inquiryMatch },
      { $sort: { 'inquiries.createdAt': -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'inquiries.buyer',
          foreignField: '_id',
          as: 'inquiries.buyer'
        }
      },
      { $unwind: '$inquiries.buyer' },
      {
        $project: {
          name: 1,
          category: 1,
          price: 1,
          'inquiries.message': 1,
          'inquiries.contactInfo': 1,
          'inquiries.status': 1,
          'inquiries.createdAt': 1,
          'inquiries.buyer.name': 1,
          'inquiries.buyer.mobile': 1,
          'inquiries.buyer.email': 1
        }
      }
    ]);

    res.json({ inquiries: crops });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get inquiries', error: error.message });
  }
});

// Update inquiry status
router.put('/inquiry/:cropId/:inquiryId', authenticateToken, requireFarmer, [
  body('status').isIn(['pending', 'responded', 'closed'])
], async (req, res) => {
  try {
    const { cropId, inquiryId } = req.params;
    const { status } = req.body;

    const crop = await Crop.findById(cropId);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Check ownership
    if (crop.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const inquiry = crop.inquiries.id(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    inquiry.status = status;
    await crop.save();

    res.json({ message: 'Inquiry updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update inquiry', error: error.message });
  }
});

// Get crop statistics
router.get('/stats/overview', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const farmerId = req.user._id;

    const stats = await Crop.aggregate([
      { $match: { farmer: farmerId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$price.value' }
        }
      }
    ]);

    const categoryStats = await Crop.aggregate([
      { $match: { farmer: farmerId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price.value' }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      categoryStats,
      totalListings: await Crop.countDocuments({ farmer: farmerId }),
      totalViews: await Crop.aggregate([
        { $match: { farmer: farmerId } },
        { $group: { _id: null, total: { $sum: '$views' } } }
      ])
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get crop statistics', error: error.message });
  }
});

module.exports = router;