const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const expertSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  mobile: String,
  specialization: [{
    type: String,
    enum: ['crop_disease', 'pest_control', 'soil_health', 'irrigation', 'fertilizers', 'organic_farming', 'livestock']
  }],
  qualifications: [String],
  experience: Number,
  location: {
    city: String,
    state: String
  },
  availability: {
    days: [String],
    hours: {
      start: String,
      end: String
    }
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

expertSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

expertSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Expert', expertSchema);