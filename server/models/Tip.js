const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    maxlength: 300
  },
  type: {
    type: String,
    enum: ['article', 'video', 'infographic', 'tutorial', 'guide'],
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'crop_management',
      'pest_control',
      'soil_health',
      'irrigation',
      'fertilization',
      'weather',
      'technology',
      'market_trends',
      'government_schemes',
      'organic_farming',
      'sustainable_practices',
      'equipment',
      'storage',
      'processing'
    ]
  },
  subcategory: String,
  tags: [String],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  media: {
    images: [String],
    videos: [{
      url: String,
      thumbnail: String,
      duration: Number, // in seconds
      provider: String // 'youtube', 'vimeo', 'local'
    }],
    documents: [{
      url: String,
      filename: String,
      size: Number
    }]
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedReadTime: {
    type: Number, // in minutes
    default: 5
  },
  language: {
    type: String,
    default: 'en'
  },
  crops: [String], // applicable crops
  regions: [String], // applicable regions
  seasons: [{
    type: String,
    enum: ['kharif', 'rabi', 'summer', 'year_round']
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 300
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    ratings: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    slug: {
      type: String,
      unique: true
    }
  }
}, {
  timestamps: true
});

// Indexes for search and filtering
tipSchema.index({ title: 'text', content: 'text', tags: 'text' });
tipSchema.index({ category: 1, status: 1 });
tipSchema.index({ featured: 1, status: 1 });
tipSchema.index({ author: 1, status: 1 });
tipSchema.index({ 'seo.slug': 1 });

// Generate slug before saving
tipSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.seo.slug) {
    this.seo.slug = this.title.toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Calculate average rating
tipSchema.methods.calculateAverageRating = function() {
  if (this.rating.ratings.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
  } else {
    const sum = this.rating.ratings.reduce((total, rating) => total + rating.score, 0);
    this.rating.average = sum / this.rating.ratings.length;
    this.rating.count = this.rating.ratings.length;
  }
  return this.save();
};

module.exports = mongoose.model('Tip', tipSchema);