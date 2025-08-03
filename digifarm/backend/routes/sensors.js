const express = require('express');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// Store sensor data in memory (in production, use Redis or database)
let sensorData = {
  temperature: 25.5,
  humidity: 65.2,
  soilMoisture: 45.8,
  ph: 6.8,
  lightIntensity: 850,
  timestamp: new Date()
};

// @route   GET /api/sensors/current
// @desc    Get current sensor readings
// @access  Private
router.get('/current', farmerAuth, async (req, res) => {
  try {
    res.json({
      sensors: sensorData,
      status: 'active'
    });
  } catch (error) {
    console.error('Sensor data error:', error);
    res.status(500).json({ message: 'Failed to fetch sensor data' });
  }
});

// @route   GET /api/sensors/history
// @desc    Get sensor data history
// @access  Private
router.get('/history', farmerAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // Generate mock historical data
    const history = [];
    const now = new Date();
    
    for (let i = parseInt(days) * 24; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      
      history.push({
        timestamp,
        temperature: (Math.random() * 15 + 20).toFixed(1),
        humidity: (Math.random() * 30 + 40).toFixed(1),
        soilMoisture: (Math.random() * 40 + 30).toFixed(1),
        ph: (Math.random() * 2 + 6).toFixed(1),
        lightIntensity: Math.round(Math.random() * 500 + 500)
      });
    }
    
    res.json({ history });
  } catch (error) {
    console.error('Sensor history error:', error);
    res.status(500).json({ message: 'Failed to fetch sensor history' });
  }
});

// @route   POST /api/sensors/calibrate
// @desc    Calibrate sensor readings
// @access  Private
router.post('/calibrate', farmerAuth, async (req, res) => {
  try {
    const { sensorType, calibrationValue } = req.body;
    
    // In a real application, this would calibrate actual sensors
    res.json({
      message: `${sensorType} sensor calibrated successfully`,
      calibrationValue,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Sensor calibration error:', error);
    res.status(500).json({ message: 'Failed to calibrate sensor' });
  }
});

// @route   GET /api/sensors/alerts
// @desc    Get sensor-based alerts
// @access  Private
router.get('/alerts', farmerAuth, async (req, res) => {
  try {
    const alerts = [];
    
    // Check for alerts based on current sensor data
    if (parseFloat(sensorData.soilMoisture) < 30) {
      alerts.push({
        type: 'warning',
        sensor: 'soilMoisture',
        message: 'Soil moisture is low. Consider irrigation.',
        value: sensorData.soilMoisture,
        threshold: 30,
        timestamp: new Date()
      });
    }
    
    if (parseFloat(sensorData.temperature) > 35) {
      alerts.push({
        type: 'warning',
        sensor: 'temperature',
        message: 'High temperature detected. Monitor crop stress.',
        value: sensorData.temperature,
        threshold: 35,
        timestamp: new Date()
      });
    }
    
    if (parseFloat(sensorData.ph) < 6.0 || parseFloat(sensorData.ph) > 8.0) {
      alerts.push({
        type: 'alert',
        sensor: 'ph',
        message: 'Soil pH is outside optimal range.',
        value: sensorData.ph,
        threshold: '6.0-8.0',
        timestamp: new Date()
      });
    }
    
    res.json({ alerts });
  } catch (error) {
    console.error('Sensor alerts error:', error);
    res.status(500).json({ message: 'Failed to fetch sensor alerts' });
  }
});

module.exports = router;