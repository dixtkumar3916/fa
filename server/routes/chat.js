const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireExpertOrAdmin } = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');

const router = express.Router();

// Get all chats for the user
router.get('/', authenticateToken, [
  query('status').optional().isIn(['active', 'resolved', 'closed', 'pending']),
  query('category').optional().isIn([
    'crop_disease', 'pest_control', 'soil_health', 'irrigation', 'fertilization',
    'weather', 'market_prices', 'government_schemes', 'technology', 'general'
  ]),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      'participants.user': req.user._id
    };
    
    if (status) query.status = status;
    if (category) query.category = category;

    const [chats, total] = await Promise.all([
      Chat.find(query)
        .populate('participants.user', 'name role profile.avatar')
        .populate('lastMessage.sender', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
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

// Get single chat with messages
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants.user', 'name role profile')
      .populate('messages.sender', 'name role profile.avatar')
      .populate('rating.ratedBy', 'name');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      p => p.user._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    // Mark messages as read
    chat.messages.forEach(message => {
      const readEntry = message.readBy.find(
        r => r.user.toString() === req.user._id.toString()
      );
      if (!readEntry) {
        message.readBy.push({ user: req.user._id });
      }
    });

    await chat.save();

    res.json({ chat });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chat', error: error.message });
  }
});

// Create new consultation chat
router.post('/', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().isLength({ max: 500 }),
  body('category').isIn([
    'crop_disease', 'pest_control', 'soil_health', 'irrigation', 'fertilization',
    'weather', 'market_prices', 'government_schemes', 'technology', 'general'
  ]).withMessage('Valid category is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('initialMessage').trim().notEmpty().withMessage('Initial message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, priority = 'medium', initialMessage } = req.body;

    // Find available experts (simple round-robin for now)
    const experts = await User.find({ 
      role: 'expert', 
      isActive: true 
    }).limit(5);

    if (experts.length === 0) {
      return res.status(503).json({ message: 'No experts available at the moment' });
    }

    // Select expert (for now, just pick the first one)
    const selectedExpert = experts[0];

    const chat = new Chat({
      participants: [
        { user: req.user._id, role: req.user.role },
        { user: selectedExpert._id, role: 'expert' }
      ],
      type: 'consultation',
      title,
      description,
      category,
      priority,
      messages: [{
        sender: req.user._id,
        content: initialMessage,
        type: 'text'
      }],
      metadata: {
        farmLocation: req.user.profile?.location,
        farmSize: req.user.profile?.farmSize
      }
    });

    await chat.updateLastMessage(chat.messages[0]);
    await chat.save();

    await chat.populate('participants.user', 'name role profile');

    // Notify expert via Socket.io
    const io = req.app.get('io');
    io.to(`expert-${selectedExpert._id}`).emit('new-consultation', {
      chatId: chat._id,
      title: chat.title,
      category: chat.category,
      priority: chat.priority,
      farmerName: req.user.name,
      message: initialMessage
    });

    res.status(201).json({
      message: 'Consultation started successfully',
      chat
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create chat', error: error.message });
  }
});

// Send message in chat
router.post('/:id/messages', authenticateToken, [
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('type').optional().isIn(['text', 'image', 'file', 'voice'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, type = 'text', attachments = [] } = req.body;

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }

    const message = {
      sender: req.user._id,
      content,
      type,
      attachments
    };

    chat.messages.push(message);
    await chat.updateLastMessage(message);

    await chat.populate('messages.sender', 'name role profile.avatar');

    // Get the newly added message
    const newMessage = chat.messages[chat.messages.length - 1];

    // Emit real-time message via Socket.io
    const io = req.app.get('io');
    chat.participants.forEach(participant => {
      if (participant.user.toString() !== req.user._id.toString()) {
        io.to(`${participant.role}-${participant.user}`).emit('new-message', {
          chatId: chat._id,
          message: newMessage,
          senderName: req.user.name
        });
      }
    });

    res.json({
      message: 'Message sent successfully',
      messageData: newMessage
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

// Update chat status
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['active', 'resolved', 'closed', 'pending'])
], async (req, res) => {
  try {
    const { status } = req.body;

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to update this chat' });
    }

    chat.status = status;
    await chat.save();

    // Notify other participants
    const io = req.app.get('io');
    chat.participants.forEach(participant => {
      if (participant.user.toString() !== req.user._id.toString()) {
        io.to(`${participant.role}-${participant.user}`).emit('chat-status-updated', {
          chatId: chat._id,
          status,
          updatedBy: req.user.name
        });
      }
    });

    res.json({ message: 'Chat status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update chat status', error: error.message });
  }
});

// Rate a consultation (only for farmers)
router.post('/:id/rate', authenticateToken, [
  body('score').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isLength({ max: 500 }).withMessage('Feedback too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { score, feedback } = req.body;

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a farmer participant
    const farmerParticipant = chat.participants.find(
      p => p.user.toString() === req.user._id.toString() && p.role === 'farmer'
    );

    if (!farmerParticipant) {
      return res.status(403).json({ message: 'Only farmers can rate consultations' });
    }

    if (chat.rating.ratedBy) {
      return res.status(400).json({ message: 'Chat has already been rated' });
    }

    chat.rating = {
      score,
      feedback,
      ratedBy: req.user._id,
      ratedAt: new Date()
    };

    await chat.save();

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit rating', error: error.message });
  }
});

// Get expert's consultations (for experts and admins)
router.get('/expert/consultations', authenticateToken, requireExpertOrAdmin, [
  query('status').optional().isIn(['active', 'resolved', 'closed', 'pending']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build query - for experts, only show their assigned chats
    const query = {
      'participants.user': req.user._id,
      'participants.role': req.user.role
    };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const [chats, total] = await Promise.all([
      Chat.find(query)
        .populate('participants.user', 'name role profile')
        .populate('lastMessage.sender', 'name')
        .sort({ priority: -1, updatedAt: -1 }) // High priority first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Chat.countDocuments(query)
    ]);

    res.json({
      consultations: chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get consultations', error: error.message });
  }
});

// Get chat statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let stats;

    if (userRole === 'farmer') {
      stats = {
        totalChats: await Chat.countDocuments({ 'participants.user': userId }),
        activeChats: await Chat.countDocuments({ 
          'participants.user': userId, 
          status: 'active' 
        }),
        resolvedChats: await Chat.countDocuments({ 
          'participants.user': userId, 
          status: 'resolved' 
        }),
        averageRating: await Chat.aggregate([
          { $match: { 'participants.user': userId, 'rating.score': { $exists: true } } },
          { $group: { _id: null, avgRating: { $avg: '$rating.score' } } }
        ])
      };
    } else if (userRole === 'expert') {
      stats = {
        totalConsultations: await Chat.countDocuments({ 'participants.user': userId }),
        activeConsultations: await Chat.countDocuments({ 
          'participants.user': userId, 
          status: 'active' 
        }),
        resolvedConsultations: await Chat.countDocuments({ 
          'participants.user': userId, 
          status: 'resolved' 
        }),
        averageRating: await Chat.aggregate([
          { $match: { 'participants.user': userId, 'rating.score': { $exists: true } } },
          { $group: { _id: null, avgRating: { $avg: '$rating.score' } } }
        ]),
        categoryBreakdown: await Chat.aggregate([
          { $match: { 'participants.user': userId } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      };
    }

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chat statistics', error: error.message });
  }
});

module.exports = router;