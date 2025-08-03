const express = require('express');
const MarketListing = require('../models/MarketListing');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/market/listings
// @desc    Create new market listing
// @access  Private
router.post('/listings', farmerAuth, async (req, res) => {
  try {
    const listing = new MarketListing({
      ...req.body,
      farmer: req.user._id
    });

    await listing.save();
    await listing.populate('farmer', 'name mobile location');

    res.status(201).json({
      message: 'Listing created successfully',
      listing
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/market/listings
// @desc    Get all active market listings
// @access  Public
router.get('/listings', async (req, res) => {
  try {
    const { 
      cropName, 
      city, 
      state, 
      quality, 
      minPrice, 
      maxPrice, 
      page = 1, 
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { status: 'active' };

    if (cropName) {
      query.cropName = { $regex: cropName, $options: 'i' };
    }
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }
    if (state) {
      query['location.state'] = { $regex: state, $options: 'i' };
    }
    if (quality) {
      query.quality = quality;
    }
    if (minPrice || maxPrice) {
      query.pricePerUnit = {};
      if (minPrice) query.pricePerUnit.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerUnit.$lte = parseFloat(maxPrice);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const listings = await MarketListing.find(query)
      .populate('farmer', 'name mobile location')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MarketListing.countDocuments(query);

    res.json({
      listings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/market/listings/:id
// @desc    Get single market listing
// @access  Public
router.get('/listings/:id', async (req, res) => {
  try {
    const listing = await MarketListing.findById(req.params.id)
      .populate('farmer', 'name mobile location');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Increment views
    listing.views += 1;
    await listing.save();

    res.json({ listing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/market/my-listings
// @desc    Get farmer's own listings
// @access  Private
router.get('/my-listings', farmerAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { farmer: req.user._id };
    if (status) query.status = status;

    const listings = await MarketListing.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MarketListing.countDocuments(query);

    res.json({
      listings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/market/listings/:id
// @desc    Update market listing
// @access  Private
router.put('/listings/:id', farmerAuth, async (req, res) => {
  try {
    const listing = await MarketListing.findOne({
      _id: req.params.id,
      farmer: req.user._id
    });

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    Object.assign(listing, req.body);
    await listing.save();

    res.json({
      message: 'Listing updated successfully',
      listing
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/market/listings/:id/inquire
// @desc    Send inquiry about a listing
// @access  Public
router.post('/listings/:id/inquire', async (req, res) => {
  try {
    const { buyer, message } = req.body;
    
    const listing = await MarketListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.inquiries.push({
      buyer,
      message,
      date: new Date()
    });

    await listing.save();

    res.json({
      message: 'Inquiry sent successfully',
      inquiry: listing.inquiries[listing.inquiries.length - 1]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/market/categories
// @desc    Get popular crop categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await MarketListing.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$cropName',
          count: { $sum: 1 },
          avgPrice: { $avg: '$pricePerUnit' },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({ categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;