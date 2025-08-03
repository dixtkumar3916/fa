const express = require('express');
const Chat = require('../models/Chat');
const { farmerAuth, expertAuth, auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/chat/start
// @desc    Start new chat with expert
// @access  Private (Farmer)
router.post('/start', farmerAuth, async (req, res) => {
  try {
    const { subject, category, priority = 'medium' } = req.body;

    const chat = new Chat({
      farmer: req.user._id,
      subject,
      category,
      priority,
      messages: []
    });

    await chat.save();
    await chat.populate('farmer', 'name mobile location');

    res.status(201).json({
      message: 'Chat started successfully',
      chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/chat/farmer
// @desc    Get farmer's chat history
// @access  Private (Farmer)
router.get('/farmer', farmerAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { farmer: req.user._id };
    if (status) query.status = status;

    const chats = await Chat.find(query)
      .populate('expert', 'name specialization')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Chat.countDocuments(query);

    res.json({
      chats,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/chat/:id
// @desc    Get single chat with messages
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // Restrict access based on user type
    if (req.userType === 'farmer') {
      query.farmer = req.user._id;
    } else if (req.userType === 'expert') {
      query.expert = req.user._id;
    }

    const chat = await Chat.findOne(query)
      .populate('farmer', 'name mobile location')
      .populate('expert', 'name specialization');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({ chat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chat/:id/message
// @desc    Send message in chat
// @access  Private
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message, attachments = [] } = req.body;
    
    let query = { _id: req.params.id };
    
    // Restrict access based on user type
    if (req.userType === 'farmer') {
      query.farmer = req.user._id;
    } else if (req.userType === 'expert') {
      query.expert = req.user._id;
    }

    const chat = await Chat.findOne(query);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const newMessage = {
      sender: req.userType,
      message,
      attachments,
      timestamp: new Date()
    };

    chat.messages.push(newMessage);
    
    // Update chat status if expert is responding for first time
    if (req.userType === 'expert' && chat.status === 'open') {
      chat.status = 'in_progress';
    }

    await chat.save();

    res.json({
      message: 'Message sent successfully',
      newMessage: chat.messages[chat.messages.length - 1]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/chat/:id/status
// @desc    Update chat status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    let query = { _id: req.params.id };
    
    if (req.userType === 'farmer') {
      query.farmer = req.user._id;
    } else if (req.userType === 'expert') {
      query.expert = req.user._id;
    }

    const chat = await Chat.findOne(query);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.status = status;
    await chat.save();

    res.json({
      message: 'Chat status updated successfully',
      status: chat.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chat/:id/rating
// @desc    Rate chat session (farmer only)
// @access  Private (Farmer)
router.post('/:id/rating', farmerAuth, async (req, res) => {
  try {
    const { score, feedback } = req.body;

    const chat = await Chat.findOne({
      _id: req.params.id,
      farmer: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.rating = { score, feedback };
    chat.status = 'closed';
    await chat.save();

    res.json({
      message: 'Rating submitted successfully',
      rating: chat.rating
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/chat/expert/available
// @desc    Get available chats for experts
// @access  Private (Expert)
router.get('/expert/available', expertAuth, async (req, res) => {
  try {
    const { category, priority, page = 1, limit = 10 } = req.query;
    
    let query = { 
      status: 'open',
      expert: { $exists: false }
    };
    
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const chats = await Chat.find(query)
      .populate('farmer', 'name location')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Chat.countDocuments(query);

    res.json({
      chats,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chat/:id/assign
// @desc    Assign chat to expert
// @access  Private (Expert)
router.post('/:id/assign', expertAuth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      status: 'open',
      expert: { $exists: false }
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found or already assigned' });
    }

    chat.expert = req.user._id;
    chat.status = 'in_progress';
    await chat.save();

    await chat.populate('farmer', 'name location');

    res.json({
      message: 'Chat assigned successfully',
      chat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;