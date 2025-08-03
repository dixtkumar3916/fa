const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  expert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expert'
  },
  subject: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['crop_disease', 'pest_control', 'soil_health', 'irrigation', 'fertilizers', 'general'],
    default: 'general'
  },
  messages: [{
    sender: {
      type: String,
      enum: ['farmer', 'expert'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [String]
  }],
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Chat', chatSchema);