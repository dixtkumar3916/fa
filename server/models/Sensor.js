const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  temperature: {
    value: Number,
    unit: {
      type: String,
      enum: ['celsius', 'fahrenheit'],
      default: 'celsius'
    }
  },
  humidity: {
    value: Number, // percentage
    unit: {
      type: String,
      default: '%'
    }
  },
  soilMoisture: {
    value: Number, // percentage
    unit: {
      type: String,
      default: '%'
    }
  },
  pH: {
    value: Number,
    unit: {
      type: String,
      default: 'pH'
    }
  },
  lightIntensity: {
    value: Number,
    unit: {
      type: String,
      default: 'lux'
    }
  },
  soilTemperature: {
    value: Number,
    unit: {
      type: String,
      enum: ['celsius', 'fahrenheit'],
      default: 'celsius'
    }
  },
  electricalConductivity: {
    value: Number,
    unit: {
      type: String,
      default: 'µS/cm'
    }
  },
  windSpeed: {
    value: Number,
    unit: {
      type: String,
      default: 'km/h'
    }
  },
  windDirection: {
    value: Number, // degrees
    unit: {
      type: String,
      default: 'degrees'
    }
  },
  rainfall: {
    value: Number,
    unit: {
      type: String,
      default: 'mm'
    }
  },
  atmosphericPressure: {
    value: Number,
    unit: {
      type: String,
      default: 'hPa'
    }
  }
});

const sensorSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['weather_station', 'soil_sensor', 'irrigation_sensor', 'greenhouse_sensor', 'multi_sensor']
  },
  location: {
    name: String,
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    },
    address: String,
    fieldArea: String // which field/area of the farm
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'active'
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  signalStrength: {
    type: Number,
    min: 0,
    max: 100
  },
  lastReading: sensorReadingSchema,
  readings: [sensorReadingSchema],
  calibration: {
    lastCalibrated: Date,
    calibrationData: mongoose.Schema.Types.Mixed,
    calibratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  alerts: [{
    type: {
      type: String,
      enum: ['low_battery', 'sensor_offline', 'abnormal_reading', 'maintenance_due']
    },
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  thresholds: {
    temperature: {
      min: Number,
      max: Number
    },
    humidity: {
      min: Number,
      max: Number
    },
    soilMoisture: {
      min: Number,
      max: Number
    },
    pH: {
      min: Number,
      max: Number
    }
  },
  metadata: {
    manufacturer: String,
    model: String,
    firmware: String,
    installationDate: Date,
    warrantyExpiry: Date,
    maintenanceSchedule: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
sensorSchema.index({ farmer: 1, status: 1 });
sensorSchema.index({ deviceId: 1 });
sensorSchema.index({ 'location.coordinates': '2dsphere' });
sensorSchema.index({ 'readings.timestamp': -1 });

// Add new reading and maintain only last 1000 readings
sensorSchema.methods.addReading = function(readingData) {
  this.lastReading = readingData;
  this.readings.push(readingData);
  
  // Keep only last 1000 readings for performance
  if (this.readings.length > 1000) {
    this.readings = this.readings.slice(-1000);
  }
  
  return this.save();
};

// Check if readings are within thresholds
sensorSchema.methods.checkThresholds = function(reading) {
  const alerts = [];
  
  if (this.thresholds.temperature && reading.temperature) {
    if (reading.temperature.value < this.thresholds.temperature.min) {
      alerts.push({
        type: 'abnormal_reading',
        message: `Temperature too low: ${reading.temperature.value}°C`,
        severity: 'medium'
      });
    } else if (reading.temperature.value > this.thresholds.temperature.max) {
      alerts.push({
        type: 'abnormal_reading',
        message: `Temperature too high: ${reading.temperature.value}°C`,
        severity: 'high'
      });
    }
  }
  
  if (this.thresholds.soilMoisture && reading.soilMoisture) {
    if (reading.soilMoisture.value < this.thresholds.soilMoisture.min) {
      alerts.push({
        type: 'abnormal_reading',
        message: `Soil moisture too low: ${reading.soilMoisture.value}%`,
        severity: 'high'
      });
    }
  }
  
  return alerts;
};

module.exports = mongoose.model('Sensor', sensorSchema);