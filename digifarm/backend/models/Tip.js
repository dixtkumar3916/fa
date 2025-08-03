const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['crop_management', 'pest_control', 'soil_health', 'irrigation', 'fertilizers', 'organic_farming', 'equipment', 'marketing']
  },
  type: {
    type: String,
    enum: ['article', 'video', 'infographic'],
    default: 'article'
  },
  media: {
    url: String,
    type: String, // video, image, pdf
    thumbnail: String
  },
  tags: [String],
  author: {
    name: String,
    designation: String
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedReadTime: Number, // in minutes
  likes: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Tip', tipSchema);