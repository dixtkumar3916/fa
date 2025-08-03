const express = require('express');
const Crop = require('../models/Crop');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/crops
// @desc    Add new crop
// @access  Private
router.post('/', farmerAuth, async (req, res) => {
  try {
    const crop = new Crop({
      ...req.body,
      farmer: req.user._id
    });

    await crop.save();

    res.status(201).json({
      message: 'Crop added successfully',
      crop
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/crops
// @desc    Get farmer's crops
// @access  Private
router.get('/', farmerAuth, async (req, res) => {
  try {
    const { status, name, page = 1, limit = 10 } = req.query;
    
    let query = { farmer: req.user._id };
    
    if (status) query.status = status;
    if (name) query.name = { $regex: name, $options: 'i' };

    const crops = await Crop.find(query)
      .populate('expenses')
      .sort({ plantingDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Crop.countDocuments(query);

    res.json({
      crops,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/crops/:id
// @desc    Get single crop
// @access  Private
router.get('/:id', farmerAuth, async (req, res) => {
  try {
    const crop = await Crop.findOne({
      _id: req.params.id,
      farmer: req.user._id
    }).populate('expenses');

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    res.json({ crop });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/crops/:id
// @desc    Update crop
// @access  Private
router.put('/:id', farmerAuth, async (req, res) => {
  try {
    const crop = await Crop.findOne({
      _id: req.params.id,
      farmer: req.user._id
    });

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    Object.assign(crop, req.body);
    await crop.save();

    res.json({
      message: 'Crop updated successfully',
      crop
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/crops/:id
// @desc    Delete crop
// @access  Private
router.delete('/:id', farmerAuth, async (req, res) => {
  try {
    const crop = await Crop.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user._id
    });

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    res.json({ message: 'Crop deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;