const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // Chat Information
  chatId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Participants
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
    isActive: {
      type: Boolean,
      default: true
    },
    lastSeen: Date
  }],
  
  // Chat Type
  type: {
    type: String,
    enum: ['farmer_expert', 'farmer_admin', 'expert_admin', 'group'],
    required: true
  },
  
  // Chat Details
  title: String,
  description: String,
  
  // Messages
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'video', 'location'],
      default: 'text'
    },
    attachments: [{
      name: String,
      url: String,
      size: Number,
      type: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
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
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  }],
  
  // Chat Status
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  
  // Priority & Category
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  category: {
    type: String,
    enum: ['general', 'technical', 'agricultural', 'equipment', 'payment', 'support'],
    default: 'general'
  },
  
  // AI Chatbot Integration
  aiEnabled: {
    type: Boolean,
    default: false
  },
  aiContext: {
    soilReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SoilReport'
    },
    equipmentBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EquipmentBooking'
    },
    cropType: String,
    location: String
  },
  
  // Expert Assignment
  assignedExpert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignmentDate: Date,
  assignmentReason: String,
  
  // Resolution
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: String,
  
  // Ratings & Feedback
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: Date
  },
  
  // Notifications
  notifications: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['message', 'mention', 'assignment', 'resolution']
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  
  // Settings
  settings: {
    autoReply: {
      enabled: { type: Boolean, default: false },
      message: String
    },
    workingHours: {
      start: String, // HH:MM format
      end: String,   // HH:MM format
      timezone: { type: String, default: 'Asia/Kolkata' }
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'te', 'kn', 'ta', 'ml'],
      default: 'en'
    }
  },
  
  // Analytics
  analytics: {
    totalMessages: { type: Number, default: 0 },
    averageResponseTime: Number, // in minutes
    firstResponseTime: Number,   // in minutes
    resolutionTime: Number,      // in hours
    satisfactionScore: Number    // 1-5 scale
  }
}, {
  timestamps: true
});

// Indexes
chatSchema.index({ chatId: 1 });
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ type: 1, status: 1 });
chatSchema.index({ assignedExpert: 1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ 'messages.timestamp': -1 });

// Pre-save middleware to generate chat ID
chatSchema.pre('save', function(next) {
  if (!this.chatId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.chatId = `CHAT${timestamp}${random}`;
  }
  next();
});

// Static method to find or create chat between two users
chatSchema.statics.findOrCreateChat = async function(user1Id, user2Id, type = 'farmer_expert') {
  // Check if chat already exists
  const existingChat = await this.findOne({
    type,
    'participants.user': { $all: [user1Id, user2Id] },
    status: 'active'
  }).populate('participants.user', 'name role');
  
  if (existingChat) {
    return existingChat;
  }
  
  // Create new chat
  const newChat = new this({
    type,
    participants: [
      { user: user1Id, role: 'farmer' },
      { user: user2Id, role: 'expert' }
    ],
    title: `Chat between users`,
    status: 'active'
  });
  
  return await newChat.save();
};

// Method to add message
chatSchema.methods.addMessage = function(senderId, content, messageType = 'text', attachments = []) {
  const message = {
    sender: senderId,
    content,
    messageType,
    attachments,
    timestamp: new Date()
  };
  
  this.messages.push(message);
  this.analytics.totalMessages += 1;
  
  // Update last activity
  this.updatedAt = new Date();
  
  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  this.messages.forEach(message => {
    if (message.sender.toString() !== userId.toString() && !message.isRead) {
      message.isRead = true;
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
    }
  });
  
  // Update participant's last seen
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastSeen = new Date();
  }
  
  return this.save();
};

// Method to assign expert
chatSchema.methods.assignExpert = function(expertId, reason) {
  this.assignedExpert = expertId;
  this.assignmentDate = new Date();
  this.assignmentReason = reason;
  
  // Add expert to participants if not already present
  const expertExists = this.participants.find(p => p.user.toString() === expertId.toString());
  if (!expertExists) {
    this.participants.push({
      user: expertId,
      role: 'expert',
      joinedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to resolve chat
chatSchema.methods.resolveChat = function(resolvedBy, notes) {
  this.resolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = notes;
  this.status = 'archived';
  
  // Calculate resolution time
  if (this.createdAt) {
    this.analytics.resolutionTime = Math.round((this.resolvedAt - this.createdAt) / (1000 * 60 * 60));
  }
  
  return this.save();
};

// Method to add rating
chatSchema.methods.addRating = function(score, comment) {
  this.rating = {
    score,
    comment,
    date: new Date()
  };
  this.analytics.satisfactionScore = score;
  
  return this.save();
};

// Method to get unread message count for a user
chatSchema.methods.getUnreadCount = function(userId) {
  return this.messages.filter(message => 
    message.sender.toString() !== userId.toString() && !message.isRead
  ).length;
};

// Method to get last message
chatSchema.methods.getLastMessage = function() {
  if (this.messages.length === 0) return null;
  return this.messages[this.messages.length - 1];
};

module.exports = mongoose.model('Chat', chatSchema);