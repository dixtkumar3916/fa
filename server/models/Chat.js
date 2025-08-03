const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'voice'],
    default: 'text'
  },
  attachments: [{
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  editedAt: Date,
  deletedAt: Date
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['farmer', 'expert', 'admin'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  type: {
    type: String,
    enum: ['consultation', 'support', 'group'],
    default: 'consultation'
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  category: {
    type: String,
    enum: [
      'crop_disease',
      'pest_control',
      'soil_health',
      'irrigation',
      'fertilization',
      'weather',
      'market_prices',
      'government_schemes',
      'technology',
      'general'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'closed', 'pending'],
    default: 'active'
  },
  messages: [messageSchema],
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  tags: [String],
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ratedAt: Date
  },
  metadata: {
    farmLocation: {
      city: String,
      state: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    cropType: String,
    farmSize: Number,
    urgencyLevel: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
chatSchema.index({ 'participants.user': 1, status: 1 });
chatSchema.index({ type: 1, status: 1 });
chatSchema.index({ category: 1, priority: 1 });
chatSchema.index({ createdAt: -1 });

// Update lastMessage when a new message is added
chatSchema.methods.updateLastMessage = function(message) {
  this.lastMessage = {
    content: message.content,
    sender: message.sender,
    timestamp: message.createdAt || new Date()
  };
  return this.save();
};

module.exports = mongoose.model('Chat', chatSchema);