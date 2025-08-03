const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireExpertOrAdmin, optionalAuth } = require('../middleware/auth');
const Tip = require('../models/Tip');

const router = express.Router();

// Get all tips (public with optional auth)
router.get('/', optionalAuth, [
  query('category').optional().isIn([
    'crop_management', 'pest_control', 'soil_health', 'irrigation', 'fertilization',
    'weather', 'technology', 'market_trends', 'government_schemes', 'organic_farming',
    'sustainable_practices', 'equipment', 'storage', 'processing'
  ]),
  query('type').optional().isIn(['article', 'video', 'infographic', 'tutorial', 'guide']),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('crop').optional().trim(),
  query('search').optional().trim(),
  query('featured').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const {
      category,
      type,
      difficulty,
      crop,
      search,
      featured,
      page = 1,
      limit = 12
    } = req.query;

    // Build query
    const query = { status: 'published' };
    
    if (category) query.category = category;
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;
    if (crop) query.crops = { $in: [new RegExp(crop, 'i')] };
    if (featured !== undefined) query.featured = featured === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      Tip.find(query)
        .populate('author', 'name role profile.avatar')
        .select('-content') // Exclude full content for list view
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Tip.countDocuments(query)
    ]);

    res.json({
      tips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        categories: await Tip.distinct('category', { status: 'published' }),
        types: await Tip.distinct('type', { status: 'published' }),
        crops: await Tip.distinct('crops', { status: 'published' })
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get tips', error: error.message });
  }
});

// Get single tip by ID or slug
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let tip = await Tip.findById(identifier)
      .populate('author', 'name role profile')
      .populate('comments.user', 'name profile.avatar')
      .populate('comments.replies.user', 'name profile.avatar');

    if (!tip) {
      tip = await Tip.findOne({ 'seo.slug': identifier, status: 'published' })
        .populate('author', 'name role profile')
        .populate('comments.user', 'name profile.avatar')
        .populate('comments.replies.user', 'name profile.avatar');
    }

    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }

    // Increment view count
    tip.views += 1;
    await tip.save();

    // Get related tips
    const relatedTips = await Tip.find({
      _id: { $ne: tip._id },
      category: tip.category,
      status: 'published'
    })
    .limit(4)
    .select('title summary type category estimatedReadTime media.images')
    .populate('author', 'name');

    res.json({ 
      tip,
      relatedTips,
      userInteraction: req.user ? {
        liked: tip.likes.some(like => like.user.toString() === req.user._id.toString()),
        canComment: true
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get tip', error: error.message });
  }
});

// Create new tip (experts and admins only)
router.post('/', authenticateToken, requireExpertOrAdmin, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('summary').optional().isLength({ max: 300 }),
  body('type').isIn(['article', 'video', 'infographic', 'tutorial', 'guide']),
  body('category').isIn([
    'crop_management', 'pest_control', 'soil_health', 'irrigation', 'fertilization',
    'weather', 'technology', 'market_trends', 'government_schemes', 'organic_farming',
    'sustainable_practices', 'equipment', 'storage', 'processing'
  ]),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('estimatedReadTime').optional().isInt({ min: 1 }),
  body('crops').optional().isArray(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tipData = {
      ...req.body,
      author: req.user._id
    };

    const tip = new Tip(tipData);
    await tip.save();

    await tip.populate('author', 'name role profile');

    res.status(201).json({
      message: 'Tip created successfully',
      tip
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create tip', error: error.message });
  }
});

// Update tip
router.put('/:id', authenticateToken, requireExpertOrAdmin, [
  body('title').optional().trim().notEmpty(),
  body('content').optional().trim().notEmpty(),
  body('summary').optional().isLength({ max: 300 }),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('featured').optional().isBoolean()
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

    // Check ownership (authors can edit their own tips, admins can edit any)
    if (req.user.role !== 'admin' && tip.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this tip' });
    }

    Object.assign(tip, req.body);
    await tip.save();

    await tip.populate('author', 'name role profile');

    res.json({
      message: 'Tip updated successfully',
      tip
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update tip', error: error.message });
  }
});

// Delete tip
router.delete('/:id', authenticateToken, requireExpertOrAdmin, async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id);
    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }

    // Check ownership (authors can delete their own tips, admins can delete any)
    if (req.user.role !== 'admin' && tip.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this tip' });
    }

    await Tip.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tip deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete tip', error: error.message });
  }
});

// Like/unlike tip
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id);
    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }

    const existingLike = tip.likes.find(
      like => like.user.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      tip.likes = tip.likes.filter(
        like => like.user.toString() !== req.user._id.toString()
      );
    } else {
      // Like
      tip.likes.push({ user: req.user._id });
    }

    await tip.save();

    res.json({
      message: existingLike ? 'Tip unliked' : 'Tip liked',
      liked: !existingLike,
      likesCount: tip.likes.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to like/unlike tip', error: error.message });
  }
});

// Add comment to tip
router.post('/:id/comments', authenticateToken, [
  body('content').trim().notEmpty().withMessage('Comment content is required').isLength({ max: 500 })
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

    const comment = {
      user: req.user._id,
      content: req.body.content
    };

    tip.comments.push(comment);
    await tip.save();

    await tip.populate('comments.user', 'name profile.avatar');

    const newComment = tip.comments[tip.comments.length - 1];

    res.json({
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
});

// Reply to comment
router.post('/:id/comments/:commentId/reply', authenticateToken, [
  body('content').trim().notEmpty().withMessage('Reply content is required').isLength({ max: 300 })
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

    const comment = tip.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = {
      user: req.user._id,
      content: req.body.content
    };

    comment.replies.push(reply);
    await tip.save();

    await tip.populate('comments.replies.user', 'name profile.avatar');

    const newReply = comment.replies[comment.replies.length - 1];

    res.json({
      message: 'Reply added successfully',
      reply: newReply
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add reply', error: error.message });
  }
});

// Rate tip
router.post('/:id/rate', authenticateToken, [
  body('score').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { score, review } = req.body;
    const tip = await Tip.findById(req.params.id);
    
    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }

    // Check if user has already rated
    const existingRating = tip.rating.ratings.find(
      rating => rating.user.toString() === req.user._id.toString()
    );

    if (existingRating) {
      existingRating.score = score;
      existingRating.review = review;
    } else {
      tip.rating.ratings.push({
        user: req.user._id,
        score,
        review
      });
    }

    await tip.calculateAverageRating();

    res.json({
      message: 'Rating submitted successfully',
      rating: {
        average: tip.rating.average,
        count: tip.rating.count
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to rate tip', error: error.message });
  }
});

// Get tips by author
router.get('/author/:authorId', optionalAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      Tip.find({ 
        author: req.params.authorId, 
        status: 'published' 
      })
        .populate('author', 'name role profile')
        .select('-content')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Tip.countDocuments({ 
        author: req.params.authorId, 
        status: 'published' 
      })
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
    res.status(500).json({ message: 'Failed to get author tips', error: error.message });
  }
});

// Get featured tips
router.get('/featured/list', async (req, res) => {
  try {
    const featuredTips = await Tip.find({ 
      status: 'published', 
      featured: true 
    })
      .populate('author', 'name role profile.avatar')
      .select('-content')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.json({ tips: featuredTips });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get featured tips', error: error.message });
  }
});

module.exports = router;