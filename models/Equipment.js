const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['tractor', 'harvester', 'irrigation', 'seeding', 'spraying', 'tillage', 'other'],
    required: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  
  // Specifications
  specifications: {
    horsepower: Number,
    fuelType: {
      type: String,
      enum: ['diesel', 'petrol', 'electric', 'hybrid']
    },
    capacity: String,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    weight: Number,
    attachments: [String]
  },
  
  // Pricing
  rentalPrice: {
    hourly: { type: Number, required: true },
    daily: { type: Number, required: true },
    weekly: { type: Number, required: true },
    monthly: { type: Number, required: true }
  },
  securityDeposit: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Location & Availability
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    }
  },
  
  // Owner Information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  operator: {
    name: String,
    phone: String,
    experience: Number,
    license: String,
    availability: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    }
  },
  
  // Status & Condition
  status: {
    type: String,
    enum: ['available', 'booked', 'maintenance', 'out_of_service'],
    default: 'available'
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    required: true
  },
  
  // Images & Documents
  images: [{
    url: String,
    caption: String,
    isPrimary: { type: Boolean, default: false }
  }],
  documents: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['registration', 'insurance', 'maintenance', 'other']
    }
  }],
  
  // Maintenance & History
  maintenanceHistory: [{
    date: Date,
    description: String,
    cost: Number,
    nextService: Date
  }],
  totalUsage: {
    hours: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 }
  },
  
  // Reviews & Ratings
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  
  // Features & Capabilities
  features: [String],
  suitableCrops: [String],
  suitableSoilTypes: [String],
  
  // Insurance & Warranty
  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date,
    coverage: String
  },
  warranty: {
    type: String,
    expiryDate: Date
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Search & Discovery
  tags: [String],
  description: String,
  highlights: [String]
}, {
  timestamps: true
});

// Indexes
equipmentSchema.index({ location: '2dsphere' });
equipmentSchema.index({ category: 1, status: 1 });
equipmentSchema.index({ owner: 1 });
equipmentSchema.index({ 'reviews.rating': -1 });

// Virtual for average rating calculation
equipmentSchema.virtual('calculatedAverageRating').get(function() {
  if (this.reviews.length === 0) return 0;
  const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / this.reviews.length).toFixed(1);
});

// Pre-save middleware to update average rating
equipmentSchema.pre('save', function(next) {
  if (this.reviews.length > 0) {
    const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = parseFloat((total / this.reviews.length).toFixed(1));
    this.reviewCount = this.reviews.length;
  }
  next();
});

// Static method to find available equipment
equipmentSchema.statics.findAvailable = function(category, location, radius = 50000) {
  const query = {
    status: 'available',
    isVerified: true
  };
  
  if (category) {
    query.category = category;
  }
  
  if (location && location.coordinates) {
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: location.coordinates
        },
        $maxDistance: radius
      }
    };
  }
  
  return this.find(query);
};

// Method to check availability for a date range
equipmentSchema.methods.isAvailableForDateRange = async function(startDate, endDate) {
  const EquipmentBooking = mongoose.model('EquipmentBooking');
  
  const conflictingBooking = await EquipmentBooking.findOne({
    equipment: this._id,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  });
  
  return !conflictingBooking;
};

// Method to add review
equipmentSchema.methods.addReview = function(userId, rating, comment) {
  // Remove existing review by this user
  this.reviews = this.reviews.filter(review => 
    review.user.toString() !== userId.toString()
  );
  
  // Add new review
  this.reviews.push({
    user: userId,
    rating,
    comment
  });
  
  return this.save();
};

module.exports = mongoose.model('Equipment', equipmentSchema);