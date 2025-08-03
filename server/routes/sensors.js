const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken, requireFarmer } = require('../middleware/auth');
const Sensor = require('../models/Sensor');

const router = express.Router();

// Get all sensors for the farmer
router.get('/', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const sensors = await Sensor.find({ farmer: req.user._id })
      .sort({ name: 1 })
      .select('-readings'); // Exclude readings array for performance

    res.json({ sensors });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get sensors', error: error.message });
  }
});

// Get single sensor with recent readings
router.get('/:id', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    // Check ownership
    if (sensor.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this sensor' });
    }

    // Get recent readings (last 24 hours)
    const recentReadings = sensor.readings
      .filter(reading => reading.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({ 
      sensor: {
        ...sensor.toObject(),
        readings: recentReadings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get sensor', error: error.message });
  }
});

// Create new sensor
router.post('/', authenticateToken, requireFarmer, [
  body('deviceId').trim().notEmpty().withMessage('Device ID is required'),
  body('name').trim().notEmpty().withMessage('Sensor name is required'),
  body('type').isIn(['weather_station', 'soil_sensor', 'irrigation_sensor', 'greenhouse_sensor', 'multi_sensor']),
  body('location.coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('location.coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if device ID already exists
    const existingSensor = await Sensor.findOne({ deviceId: req.body.deviceId });
    if (existingSensor) {
      return res.status(400).json({ message: 'Sensor with this device ID already exists' });
    }

    const sensorData = {
      ...req.body,
      farmer: req.user._id
    };

    const sensor = new Sensor(sensorData);
    await sensor.save();

    res.status(201).json({
      message: 'Sensor added successfully',
      sensor
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create sensor', error: error.message });
  }
});

// Update sensor
router.put('/:id', authenticateToken, requireFarmer, [
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'inactive', 'maintenance', 'error']),
  body('location.name').optional().trim(),
  body('thresholds.temperature.min').optional().isFloat(),
  body('thresholds.temperature.max').optional().isFloat(),
  body('thresholds.humidity.min').optional().isFloat(),
  body('thresholds.humidity.max').optional().isFloat(),
  body('thresholds.soilMoisture.min').optional().isFloat(),
  body('thresholds.soilMoisture.max').optional().isFloat(),
  body('thresholds.pH.min').optional().isFloat(),
  body('thresholds.pH.max').optional().isFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sensor = await Sensor.findById(req.params.id);
    
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    // Check ownership
    if (sensor.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this sensor' });
    }

    Object.assign(sensor, req.body);
    await sensor.save();

    res.json({
      message: 'Sensor updated successfully',
      sensor
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update sensor', error: error.message });
  }
});

// Delete sensor
router.delete('/:id', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    // Check ownership
    if (sensor.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this sensor' });
    }

    await Sensor.findByIdAndDelete(req.params.id);

    res.json({ message: 'Sensor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete sensor', error: error.message });
  }
});

// Add sensor reading (typically called by IoT devices)
router.post('/:deviceId/reading', [
  body('temperature.value').optional().isFloat(),
  body('humidity.value').optional().isFloat({ min: 0, max: 100 }),
  body('soilMoisture.value').optional().isFloat({ min: 0, max: 100 }),
  body('pH.value').optional().isFloat({ min: 0, max: 14 }),
  body('lightIntensity.value').optional().isFloat({ min: 0 }),
  body('soilTemperature.value').optional().isFloat(),
  body('electricalConductivity.value').optional().isFloat({ min: 0 }),
  body('windSpeed.value').optional().isFloat({ min: 0 }),
  body('windDirection.value').optional().isFloat({ min: 0, max: 360 }),
  body('rainfall.value').optional().isFloat({ min: 0 }),
  body('atmosphericPressure.value').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sensor = await Sensor.findOne({ deviceId: req.params.deviceId });
    
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    const readingData = {
      ...req.body,
      timestamp: new Date()
    };

    // Check thresholds and create alerts
    const alerts = sensor.checkThresholds(readingData);
    if (alerts.length > 0) {
      sensor.alerts.push(...alerts);
    }

    // Add reading to sensor
    await sensor.addReading(readingData);

    // Emit real-time data via Socket.io
    const io = req.app.get('io');
    io.to(`farmer-${sensor.farmer}`).emit('sensor-data', {
      sensorId: sensor._id,
      deviceId: sensor.deviceId,
      name: sensor.name,
      reading: readingData,
      alerts: alerts
    });

    res.json({
      message: 'Reading recorded successfully',
      alerts: alerts.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record reading', error: error.message });
  }
});

// Get sensor readings with filtering
router.get('/:id/readings', authenticateToken, requireFarmer, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    const sensor = await Sensor.findById(req.params.id);
    
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    // Check ownership
    if (sensor.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this sensor' });
    }

    let readings = sensor.readings;

    // Filter by date range
    if (startDate || endDate) {
      readings = readings.filter(reading => {
        const readingDate = reading.timestamp;
        if (startDate && readingDate < new Date(startDate)) return false;
        if (endDate && readingDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Sort by timestamp (newest first) and limit
    readings = readings
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, parseInt(limit));

    res.json({ readings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get sensor readings', error: error.message });
  }
});

// Get sensor analytics
router.get('/:id/analytics', authenticateToken, requireFarmer, [
  query('period').optional().isIn(['day', 'week', 'month']),
  query('metric').optional().isIn(['temperature', 'humidity', 'soilMoisture', 'pH'])
], async (req, res) => {
  try {
    const { period = 'day', metric = 'temperature' } = req.query;
    
    const sensor = await Sensor.findById(req.params.id);
    
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    // Check ownership
    if (sensor.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this sensor' });
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'day':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    // Filter readings by date and metric
    const relevantReadings = sensor.readings
      .filter(reading => reading.timestamp >= startDate && reading[metric])
      .map(reading => ({
        timestamp: reading.timestamp,
        value: reading[metric].value
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (relevantReadings.length === 0) {
      return res.json({
        analytics: {
          metric,
          period,
          count: 0,
          average: 0,
          min: 0,
          max: 0,
          trend: [],
          message: 'No data available for the selected period'
        }
      });
    }

    // Calculate statistics
    const values = relevantReadings.map(r => r.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Group readings for trend analysis
    const groupedReadings = [];
    const groupSize = Math.max(1, Math.floor(relevantReadings.length / 24)); // Max 24 data points
    
    for (let i = 0; i < relevantReadings.length; i += groupSize) {
      const group = relevantReadings.slice(i, i + groupSize);
      const groupAvg = group.reduce((sum, r) => sum + r.value, 0) / group.length;
      groupedReadings.push({
        timestamp: group[Math.floor(group.length / 2)].timestamp,
        value: groupAvg
      });
    }

    const analytics = {
      metric,
      period,
      count: relevantReadings.length,
      average: parseFloat(average.toFixed(2)),
      min,
      max,
      trend: groupedReadings,
      lastReading: relevantReadings[relevantReadings.length - 1]
    };

    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get sensor analytics', error: error.message });
  }
});

// Acknowledge sensor alert
router.put('/:id/alerts/:alertId/acknowledge', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    
    if (!sensor) {
      return res.status(404).json({ message: 'Sensor not found' });
    }

    // Check ownership
    if (sensor.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const alert = sensor.alerts.id(req.params.alertId);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedAt = new Date();

    await sensor.save();

    res.json({ message: 'Alert acknowledged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to acknowledge alert', error: error.message });
  }
});

// Get all alerts for farmer's sensors
router.get('/alerts/all', authenticateToken, requireFarmer, [
  query('acknowledged').optional().isBoolean(),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const { acknowledged, severity } = req.query;
    
    const sensors = await Sensor.find({ farmer: req.user._id });
    
    let allAlerts = [];
    
    sensors.forEach(sensor => {
      sensor.alerts.forEach(alert => {
        // Apply filters
        if (acknowledged !== undefined && alert.acknowledged !== (acknowledged === 'true')) return;
        if (severity && alert.severity !== severity) return;
        
        allAlerts.push({
          ...alert.toObject(),
          sensorId: sensor._id,
          sensorName: sensor.name,
          deviceId: sensor.deviceId
        });
      });
    });

    // Sort by creation date (newest first)
    allAlerts.sort((a, b) => b.createdAt - a.createdAt);

    res.json({ alerts: allAlerts });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get alerts', error: error.message });
  }
});

module.exports = router;