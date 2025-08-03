const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  crop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop'
  },
  category: {
    type: String,
    required: true,
    enum: ['seeds', 'fertilizers', 'pesticides', 'labor', 'equipment', 'irrigation', 'transportation', 'other']
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'credit_card'],
    default: 'cash'
  },
  vendor: {
    name: String,
    contact: String
  },
  receipt: String, // URL to receipt image
  notes: String,
  isRecurring: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);