const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['farmer', 'admin', 'expert'],
    required: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  
  // Location Information
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  
  // Verification & Status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Authentication
  googleId: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  
  // Farmer Specific Fields
  farmer: {
    farmSize: Number, // in acres
    farmType: {
      type: String,
      enum: ['organic', 'conventional', 'mixed']
    },
    primaryCrops: [String],
    experience: Number, // years of farming experience
    soilReports: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SoilReport'
    }],
    assignedExpert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    equipmentBookings: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EquipmentBooking'
    }],
    cropCalendar: [{
      crop: String,
      plantingDate: Date,
      harvestDate: Date,
      status: {
        type: String,
        enum: ['planned', 'planted', 'growing', 'harvested']
      }
    }]
  },
  
  // Expert Specific Fields
  expert: {
    specialization: [String],
    qualification: String,
    experience: Number, // years of experience
    certification: [String],
    assignedFarmers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    availability: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'available'
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    },
    consultationFee: {
      type: Number,
      default: 0
    }
  },
  
  // Admin Specific Fields
  admin: {
    permissions: [String],
    department: String,
    accessLevel: {
      type: String,
      enum: ['super', 'moderator', 'support'],
      default: 'support'
    }
  },
  
  // Common Fields
  preferences: {
    language: {
      type: String,
      enum: ['en', 'hi', 'te', 'kn', 'ta', 'ml'],
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  
  // Timestamps
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for geospatial queries
userSchema.index({ location: '2dsphere' });

// Index for role-based queries
userSchema.index({ role: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpire;
  
  return userObject;
};

// Static method to find by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find experts with available slots
userSchema.statics.findAvailableExperts = function() {
  return this.find({
    role: 'expert',
    isActive: true,
    'expert.availability': 'available',
    $expr: { $lt: [{ $size: '$expert.assignedFarmers' }, 5] }
  });
};

module.exports = mongoose.model('User', userSchema);