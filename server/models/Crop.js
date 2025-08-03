const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  variety: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['grains', 'vegetables', 'fruits', 'pulses', 'spices', 'cash_crops', 'other']
  },
  quantity: {
    value: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'quintal', 'ton', 'piece', 'dozen', 'bag']
    }
  },
  price: {
    value: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      enum: ['per_kg', 'per_quintal', 'per_ton', 'per_piece', 'per_dozen', 'per_bag', 'total']
    }
  },
  description: {
    type: String,
    maxlength: 1000
  },
  images: [String], // URLs to crop images
  location: {
    address: String,
    city: String,
    state: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  harvestDate: {
    type: Date,
    required: true
  },
  availableFrom: {
    type: Date,
    default: Date.now
  },
  availableUntil: {
    type: Date,
    required: true
  },
  quality: {
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'Premium'],
      default: 'A'
    },
    organic: {
      type: Boolean,
      default: false
    },
    certifications: [String]
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'reserved', 'expired'],
    default: 'available'
  },
  inquiries: [{
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    contactInfo: {
      phone: String,
      email: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'responded', 'closed'],
      default: 'pending'
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for search and location queries
cropSchema.index({ name: 'text', description: 'text', variety: 'text' });
cropSchema.index({ 'location.coordinates': '2dsphere' });
cropSchema.index({ category: 1, status: 1 });
cropSchema.index({ farmer: 1, status: 1 });

module.exports = mongoose.model('Crop', cropSchema);