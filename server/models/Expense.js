const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  category: {
    type: String,
    required: true,
    enum: [
      'seeds',
      'fertilizers',
      'pesticides',
      'labor',
      'equipment',
      'fuel',
      'irrigation',
      'transportation',
      'storage',
      'marketing',
      'insurance',
      'taxes',
      'utilities',
      'veterinary',
      'feed',
      'maintenance',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'credit'],
    default: 'cash'
  },
  vendor: {
    name: String,
    contact: String,
    address: String
  },
  receipt: {
    number: String,
    image: String // URL to receipt image
  },
  tags: [String],
  season: {
    type: String,
    enum: ['kharif', 'rabi', 'summer', 'year_round']
  },
  cropRelated: {
    crop: String,
    area: Number // area in acres for which this expense was incurred
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually']
    },
    endDate: Date
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
expenseSchema.index({ farmer: 1, date: -1 });
expenseSchema.index({ farmer: 1, category: 1, date: -1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ 'cropRelated.crop': 1, farmer: 1 });

// Virtual for month-year grouping
expenseSchema.virtual('monthYear').get(function() {
  return {
    month: this.date.getMonth() + 1,
    year: this.date.getFullYear()
  };
});

module.exports = mongoose.model('Expense', expenseSchema);