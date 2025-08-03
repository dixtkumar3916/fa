const express = require('express');
const Tip = require('../models/Tip');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tips
// @desc    Get all published tips
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      type, 
      difficulty, 
      search, 
      page = 1, 
      limit = 12,
      featured = false 
    } = req.query;

    let query = { isPublished: true };

    if (category) query.category = category;
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;
    if (featured === 'true') query.isFeatured = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const tips = await Tip.find(query)
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content');

    const total = await Tip.countDocuments(query);

    res.json({
      tips,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tips/:id
// @desc    Get single tip with full content
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id);

    if (!tip || !tip.isPublished) {
      return res.status(404).json({ message: 'Tip not found' });
    }

    // Increment views
    tip.views += 1;
    await tip.save();

    res.json({ tip });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tips/:id/like
// @desc    Like a tip
// @access  Private
router.post('/:id/like', farmerAuth, async (req, res) => {
  try {
    const tip = await Tip.findById(req.params.id);

    if (!tip) {
      return res.status(404).json({ message: 'Tip not found' });
    }

    tip.likes += 1;
    await tip.save();

    res.json({ 
      message: 'Tip liked successfully',
      likes: tip.likes 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tips/categories/list
// @desc    Get all tip categories
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Tip.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          latestUpdate: { $max: '$updatedAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tips/featured/latest
// @desc    Get latest featured tips
// @access  Public
router.get('/featured/latest', async (req, res) => {
  try {
    const tips = await Tip.find({ 
      isPublished: true, 
      isFeatured: true 
    })
    .sort({ createdAt: -1 })
    .limit(6)
    .select('title media.thumbnail category difficulty estimatedReadTime createdAt');

    res.json({ tips });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Seed some sample tips if database is empty
router.get('/seed/sample', async (req, res) => {
  try {
    const count = await Tip.countDocuments();
    
    if (count === 0) {
      const sampleTips = [
        {
          title: "Organic Pest Control Methods for Vegetables",
          content: "Learn effective organic methods to control pests in your vegetable garden without harmful chemicals. This comprehensive guide covers natural pesticides, companion planting, and biological control methods.",
          category: "pest_control",
          type: "article",
          tags: ["organic", "vegetables", "pest control", "natural"],
          author: { name: "Dr. Rajesh Kumar", designation: "Agricultural Expert" },
          difficulty: "beginner",
          estimatedReadTime: 8,
          isFeatured: true
        },
        {
          title: "Smart Irrigation Techniques for Water Conservation",
          content: "Discover modern irrigation methods that can save up to 40% water while maintaining optimal crop growth. Learn about drip irrigation, sprinkler systems, and moisture sensors.",
          category: "irrigation",
          type: "video",
          media: {
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            type: "video",
            thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
          },
          tags: ["irrigation", "water conservation", "drip irrigation"],
          author: { name: "Priya Sharma", designation: "Irrigation Specialist" },
          difficulty: "intermediate",
          estimatedReadTime: 12,
          isFeatured: true
        },
        {
          title: "Soil Health Management: Building Fertile Soil",
          content: "Understanding soil composition, pH levels, and nutrient management. Learn how to improve soil fertility through organic matter, composting, and proper crop rotation.",
          category: "soil_health",
          type: "article",
          tags: ["soil health", "composting", "fertility", "organic matter"],
          author: { name: "Dr. Anil Verma", designation: "Soil Scientist" },
          difficulty: "intermediate",
          estimatedReadTime: 15
        },
        {
          title: "Crop Rotation for Sustainable Farming",
          content: "Master the art of crop rotation to maintain soil fertility, reduce pest problems, and maximize yields. This guide covers rotation patterns for different crops and seasons.",
          category: "crop_management",
          type: "article",
          tags: ["crop rotation", "sustainable farming", "soil fertility"],
          author: { name: "Sunita Patel", designation: "Sustainable Agriculture Expert" },
          difficulty: "advanced",
          estimatedReadTime: 10
        },
        {
          title: "Modern Fertilizer Application Techniques",
          content: "Learn about precision fertilizer application, timing, and dosage calculations. Understand different types of fertilizers and their optimal usage for various crops.",
          category: "fertilizers",
          type: "video",
          media: {
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            type: "video",
            thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
          },
          tags: ["fertilizers", "precision agriculture", "nutrition"],
          author: { name: "Ramesh Gupta", designation: "Fertilizer Expert" },
          difficulty: "intermediate",
          estimatedReadTime: 14
        },
        {
          title: "Digital Marketing for Farm Products",
          content: "Learn how to market your farm products online, create an online presence, and connect directly with buyers. Covers social media marketing, e-commerce, and digital payment systems.",
          category: "marketing",
          type: "article",
          tags: ["digital marketing", "e-commerce", "farm products"],
          author: { name: "Kavita Singh", designation: "Agricultural Marketing Specialist" },
          difficulty: "beginner",
          estimatedReadTime: 12,
          isFeatured: true
        }
      ];

      await Tip.insertMany(sampleTips);
      res.json({ message: 'Sample tips created successfully', count: sampleTips.length });
    } else {
      res.json({ message: 'Tips already exist', count });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;