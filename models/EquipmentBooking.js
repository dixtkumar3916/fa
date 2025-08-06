const mongoose = require('mongoose');

const equipmentBookingSchema = new mongoose.Schema({
  // Booking Information
  bookingId: {
    type: String,
    unique: true,
    required: true
  },
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Date & Time
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  
  // Duration & Pricing
  duration: {
    hours: Number,
    days: Number,
    weeks: Number
  },
  rentalType: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true
  },
  ratePerUnit: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  securityDeposit: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Location
  deliveryLocation: {
    address: String,
    coordinates: [Number],
    instructions: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  
  // Payment Information
  payment: {
    method: {
      type: String,
      enum: ['cod', 'online', 'wallet'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    gateway: {
      type: String,
      enum: ['stripe', 'razorpay', 'cod']
    },
    paidAmount: Number,
    paidAt: Date,
    refundAmount: Number,
    refundedAt: Date
  },
  
  // Operator Information
  operatorRequired: {
    type: Boolean,
    default: true
  },
  operator: {
    name: String,
    phone: String,
    experience: Number,
    license: String
  },
  
  // Communication
  messages: [{
    sender: {
      type: String,
      enum: ['farmer', 'owner', 'admin']
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
  
  // Reviews & Ratings
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    date: Date
  },
  
  // Cancellation & Refunds
  cancellation: {
    requestedBy: {
      type: String,
      enum: ['farmer', 'owner', 'admin']
    },
    reason: String,
    requestedAt: Date,
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'completed']
    }
  },
  
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ['sms', 'email', 'push']
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    content: String
  }],
  
  // Additional Information
  specialRequirements: String,
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  
  // Timestamps
  confirmedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// Indexes
equipmentBookingSchema.index({ bookingId: 1 });
equipmentBookingSchema.index({ farmer: 1, status: 1 });
equipmentBookingSchema.index({ equipment: 1, status: 1 });
equipmentBookingSchema.index({ startDate: 1, endDate: 1 });
equipmentBookingSchema.index({ 'payment.status': 1 });

// Pre-save middleware to generate booking ID
equipmentBookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.bookingId = `ACB${timestamp}${random}`;
  }
  
  // Calculate duration
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    this.duration = {
      hours: diffHours,
      days: diffDays,
      weeks: Math.ceil(diffDays / 7)
    };
  }
  
  next();
});

// Static method to find conflicting bookings
equipmentBookingSchema.statics.findConflictingBookings = function(equipmentId, startDate, endDate, excludeBookingId = null) {
  const query = {
    equipment: equipmentId,
    status: { $in: ['pending', 'confirmed', 'in_progress'] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  return this.find(query);
};

// Method to calculate total amount
equipmentBookingSchema.methods.calculateTotalAmount = function() {
  const duration = this.duration;
  let total = 0;
  
  switch (this.rentalType) {
    case 'hourly':
      total = duration.hours * this.ratePerUnit;
      break;
    case 'daily':
      total = duration.days * this.ratePerUnit;
      break;
    case 'weekly':
      total = duration.weeks * this.ratePerUnit;
      break;
    case 'monthly':
      total = Math.ceil(duration.days / 30) * this.ratePerUnit;
      break;
  }
  
  this.totalAmount = total;
  return total;
};

// Method to add message
equipmentBookingSchema.methods.addMessage = function(sender, message) {
  this.messages.push({
    sender,
    message,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to mark messages as read
equipmentBookingSchema.methods.markMessagesAsRead = function(userType) {
  this.messages.forEach(message => {
    if (message.sender !== userType) {
      message.isRead = true;
    }
  });
  
  return this.save();
};

// Method to request cancellation
equipmentBookingSchema.methods.requestCancellation = function(requestedBy, reason) {
  this.cancellation = {
    requestedBy,
    reason,
    requestedAt: new Date()
  };
  
  return this.save();
};

// Method to approve cancellation
equipmentBookingSchema.methods.approveCancellation = function(approvedBy, refundAmount) {
  this.cancellation.approvedAt = new Date();
  this.cancellation.approvedBy = approvedBy;
  this.cancellation.refundAmount = refundAmount;
  this.cancellation.refundStatus = 'pending';
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  
  return this.save();
};

module.exports = mongoose.model('EquipmentBooking', equipmentBookingSchema);