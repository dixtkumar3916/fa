const express = require('express');
const axios = require('axios');
const { authenticateToken, requireFarmer } = require('../middleware/auth');
const User = require('../models/User');
const Crop = require('../models/Crop');
const Expense = require('../models/Expense');
const Sensor = require('../models/Sensor');
const Chat = require('../models/Chat');

const router = express.Router();

// Get dashboard overview
router.get('/overview', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const farmerId = req.user._id;
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // Get basic stats
    const [
      totalCrops,
      activeCrops,
      soldCrops,
      monthlyExpenses,
      lastMonthExpenses,
      activeSensors,
      pendingChats,
      recentExpenses
    ] = await Promise.all([
      Crop.countDocuments({ farmer: farmerId }),
      Crop.countDocuments({ farmer: farmerId, status: 'available' }),
      Crop.countDocuments({ farmer: farmerId, status: 'sold' }),
      Expense.aggregate([
        { 
          $match: { 
            farmer: farmerId, 
            date: { $gte: currentMonth } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          } 
        }
      ]),
      Expense.aggregate([
        { 
          $match: { 
            farmer: farmerId, 
            date: { $gte: lastMonth, $lt: currentMonth } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' } 
          } 
        }
      ]),
      Sensor.countDocuments({ farmer: farmerId, status: 'active' }),
      Chat.countDocuments({ 
        'participants.user': farmerId, 
        status: { $in: ['active', 'pending'] } 
      }),
      Expense.find({ farmer: farmerId })
        .sort({ date: -1 })
        .limit(5)
        .select('title amount category date')
    ]);

    // Calculate expense trends
    const currentMonthTotal = monthlyExpenses[0]?.total || 0;
    const lastMonthTotal = lastMonthExpenses[0]?.total || 0;
    const expenseChange = lastMonthTotal > 0 
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
      : 0;

    // Get expense breakdown by category
    const expenseBreakdown = await Expense.aggregate([
      { $match: { farmer: farmerId, date: { $gte: currentMonth } } },
      { 
        $group: { 
          _id: '$category', 
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    // Get crop sales data
    const salesData = await Crop.aggregate([
      { 
        $match: { 
          farmer: farmerId, 
          status: 'sold',
          updatedAt: { $gte: currentMonth }
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalRevenue: { $sum: '$price.value' },
          totalQuantity: { $sum: '$quantity.value' },
          count: { $sum: 1 }
        } 
      }
    ]);

    const overview = {
      crops: {
        total: totalCrops,
        active: activeCrops,
        sold: soldCrops,
        revenue: salesData[0]?.totalRevenue || 0
      },
      expenses: {
        thisMonth: currentMonthTotal,
        lastMonth: lastMonthTotal,
        change: parseFloat(expenseChange),
        count: monthlyExpenses[0]?.count || 0,
        breakdown: expenseBreakdown
      },
      sensors: {
        active: activeSensors,
        total: await Sensor.countDocuments({ farmer: farmerId })
      },
      consultations: {
        pending: pendingChats,
        total: await Chat.countDocuments({ 'participants.user': farmerId })
      },
      recentActivity: {
        expenses: recentExpenses,
        crops: await Crop.find({ farmer: farmerId })
          .sort({ createdAt: -1 })
          .limit(3)
          .select('name category status price createdAt')
      }
    };

    res.json({ overview });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Failed to get dashboard overview', error: error.message });
  }
});

// Get weather data
router.get('/weather/:location?', authenticateToken, async (req, res) => {
  try {
    let location = req.params.location;
    
    // If no location provided, try to get from user profile
    if (!location) {
      const user = await User.findById(req.user._id);
      location = user.profile?.location?.city || 'Delhi'; // Default to Delhi
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'Weather API key not configured' });
    }

    // Get current weather
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
    const currentWeatherResponse = await axios.get(currentWeatherUrl);
    const currentWeather = currentWeatherResponse.data;

    // Get 7-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=metric`;
    const forecastResponse = await axios.get(forecastUrl);
    const forecastData = forecastResponse.data;

    // Process forecast data (get daily forecasts)
    const dailyForecasts = [];
    const processedDates = new Set();
    
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!processedDates.has(date) && dailyForecasts.length < 7) {
        processedDates.add(date);
        dailyForecasts.push({
          date: item.dt,
          temperature: {
            min: item.main.temp_min,
            max: item.main.temp_max,
            current: item.main.temp
          },
          humidity: item.main.humidity,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          windSpeed: item.wind?.speed || 0,
          windDirection: item.wind?.deg || 0,
          pressure: item.main.pressure,
          visibility: item.visibility || 0,
          clouds: item.clouds?.all || 0,
          rain: item.rain?.['3h'] || 0
        });
      }
    });

    const weatherData = {
      location: {
        name: currentWeather.name,
        country: currentWeather.sys.country,
        coordinates: {
          lat: currentWeather.coord.lat,
          lng: currentWeather.coord.lon
        }
      },
      current: {
        temperature: currentWeather.main.temp,
        feelsLike: currentWeather.main.feels_like,
        humidity: currentWeather.main.humidity,
        pressure: currentWeather.main.pressure,
        visibility: currentWeather.visibility,
        uvIndex: 0, // Not available in free plan
        windSpeed: currentWeather.wind?.speed || 0,
        windDirection: currentWeather.wind?.deg || 0,
        description: currentWeather.weather[0].description,
        icon: currentWeather.weather[0].icon,
        clouds: currentWeather.clouds.all,
        sunrise: currentWeather.sys.sunrise,
        sunset: currentWeather.sys.sunset,
        timestamp: currentWeather.dt
      },
      forecast: dailyForecasts,
      alerts: [] // Would need a different API for weather alerts
    };

    res.json({ weather: weatherData });
  } catch (error) {
    console.error('Weather API error:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ message: 'Location not found' });
    }
    
    res.status(500).json({ 
      message: 'Failed to get weather data', 
      error: error.message 
    });
  }
});

// Get sensor data summary
router.get('/sensors', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const farmerId = req.user._id;
    
    const sensors = await Sensor.find({ farmer: farmerId })
      .select('name type status lastReading batteryLevel signalStrength location alerts')
      .sort({ name: 1 });

    const sensorSummary = {
      total: sensors.length,
      active: sensors.filter(s => s.status === 'active').length,
      offline: sensors.filter(s => s.status === 'inactive').length,
      alerts: sensors.reduce((total, sensor) => total + sensor.alerts.filter(a => !a.acknowledged).length, 0),
      sensors: sensors.map(sensor => ({
        id: sensor._id,
        name: sensor.name,
        type: sensor.type,
        status: sensor.status,
        location: sensor.location?.name || 'Unknown',
        batteryLevel: sensor.batteryLevel,
        signalStrength: sensor.signalStrength,
        lastReading: sensor.lastReading,
        alerts: sensor.alerts.filter(a => !a.acknowledged).length
      }))
    };

    res.json({ sensors: sensorSummary });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get sensor data', error: error.message });
  }
});

// Get farming insights and recommendations
router.get('/insights', authenticateToken, requireFarmer, async (req, res) => {
  try {
    const farmerId = req.user._id;
    const insights = [];

    // Expense insights
    const highExpenseCategories = await Expense.aggregate([
      { 
        $match: { 
          farmer: farmerId, 
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
        } 
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 3 }
    ]);

    if (highExpenseCategories.length > 0) {
      insights.push({
        type: 'expense',
        title: 'High Expense Alert',
        message: `Your top expense category this month is ${highExpenseCategories[0]._id} (₹${highExpenseCategories[0].total})`,
        priority: 'medium',
        actionable: true,
        action: 'Review expense breakdown'
      });
    }

    // Crop insights
    const expiredCrops = await Crop.countDocuments({
      farmer: farmerId,
      status: 'available',
      availableUntil: { $lt: new Date() }
    });

    if (expiredCrops > 0) {
      insights.push({
        type: 'crop',
        title: 'Expired Listings',
        message: `You have ${expiredCrops} crop listings that have expired`,
        priority: 'high',
        actionable: true,
        action: 'Update crop listings'
      });
    }

    // Sensor insights
    const offlineSensors = await Sensor.countDocuments({
      farmer: farmerId,
      status: { $in: ['inactive', 'error'] }
    });

    if (offlineSensors > 0) {
      insights.push({
        type: 'sensor',
        title: 'Sensor Issues',
        message: `${offlineSensors} sensors are offline or have errors`,
        priority: 'high',
        actionable: true,
        action: 'Check sensor status'
      });
    }

    // General recommendations
    insights.push({
      type: 'recommendation',
      title: 'Weather Advisory',
      message: 'Based on the forecast, consider adjusting irrigation schedule',
      priority: 'low',
      actionable: true,
      action: 'View weather forecast'
    });

    res.json({ insights });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get insights', error: error.message });
  }
});

module.exports = router;