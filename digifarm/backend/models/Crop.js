const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  variety: String,
  plantingDate: {
    type: Date,
    required: true
  },
  expectedHarvestDate: Date,
  actualHarvestDate: Date,
  area: {
    type: Number,
    required: true // in acres
  },
  status: {
    type: String,
    enum: ['planted', 'growing', 'harvested', 'sold'],
    default: 'planted'
  },
  quantity: {
    planted: Number,
    harvested: Number,
    sold: Number
  },
  quality: {
    type: String,
    enum: ['premium', 'good', 'average'],
    default: 'good'
  },
  pricePerUnit: Number,
  totalRevenue: Number,
  expenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }],
  notes: String,
  images: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('Crop', cropSchema);