const mongoose = require('mongoose');

const marketListingSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  cropName: {
    type: String,
    required: true
  },
  variety: String,
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'quintal', 'ton', 'pieces'],
    default: 'kg'
  },
  pricePerUnit: {
    type: Number,
    required: true
  },
  totalPrice: Number,
  quality: {
    type: String,
    enum: ['premium', 'good', 'average'],
    default: 'good'
  },
  description: String,
  images: [String],
  location: {
    city: String,
    state: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  harvestDate: Date,
  availableFrom: {
    type: Date,
    default: Date.now
  },
  availableUntil: Date,
  status: {
    type: String,
    enum: ['active', 'sold', 'expired', 'withdrawn'],
    default: 'active'
  },
  inquiries: [{
    buyer: {
      name: String,
      email: String,
      mobile: String
    },
    message: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total price before saving
marketListingSchema.pre('save', function(next) {
  this.totalPrice = this.quantity * this.pricePerUnit;
  next();
});

module.exports = mongoose.model('MarketListing', marketListingSchema);