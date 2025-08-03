const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const farmerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  mobile: {
    type: String,
    required: true
  },
  location: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  farmDetails: {
    farmSize: {
      type: Number,
      required: true
    },
    farmType: {
      type: String,
      enum: ['organic', 'conventional', 'mixed'],
      default: 'conventional'
    },
    soilType: {
      type: String,
      enum: ['clay', 'sandy', 'loamy', 'silt'],
      default: 'loamy'
    },
    crops: [String]
  },
  profile: {
    avatar: String,
    experience: Number,
    specialization: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
farmerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
farmerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Farmer', farmerSchema);