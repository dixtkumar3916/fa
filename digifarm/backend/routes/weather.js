const express = require('express');
const axios = require('axios');
const { farmerAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/weather/current/:city
// @desc    Get current weather for a city
// @access  Private
router.get('/current/:city', farmerAuth, async (req, res) => {
  try {
    const { city } = req.params;
    const API_KEY = process.env.OPENWEATHER_API_KEY || 'demo_key';
    
    // For demo purposes, return mock data if no API key
    if (API_KEY === 'demo_key') {
      const mockWeather = {
        city: city,
        temperature: Math.round(Math.random() * 15 + 20),
        humidity: Math.round(Math.random() * 30 + 40),
        windSpeed: Math.round(Math.random() * 10 + 5),
        description: ['Clear sky', 'Few clouds', 'Scattered clouds', 'Broken clouds', 'Light rain'][Math.floor(Math.random() * 5)],
        icon: '01d',
        pressure: Math.round(Math.random() * 20 + 1000),
        visibility: Math.round(Math.random() * 5 + 5),
        uvIndex: Math.round(Math.random() * 10 + 1)
      };
      
      return res.json({ weather: mockWeather });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    );

    const weather = {
      city: response.data.name,
      temperature: Math.round(response.data.main.temp),
      humidity: response.data.main.humidity,
      windSpeed: response.data.wind.speed,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      pressure: response.data.main.pressure,
      visibility: response.data.visibility / 1000,
      uvIndex: 5 // Would need separate UV API call
    };

    res.json({ weather });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ message: 'Failed to fetch weather data' });
  }
});

// @route   GET /api/weather/forecast/:city
// @desc    Get 7-day weather forecast
// @access  Private
router.get('/forecast/:city', farmerAuth, async (req, res) => {
  try {
    const { city } = req.params;
    const API_KEY = process.env.OPENWEATHER_API_KEY || 'demo_key';
    
    // For demo purposes, return mock data if no API key
    if (API_KEY === 'demo_key') {
      const mockForecast = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        mockForecast.push({
          date: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          temperature: {
            max: Math.round(Math.random() * 10 + 25),
            min: Math.round(Math.random() * 10 + 15)
          },
          humidity: Math.round(Math.random() * 30 + 40),
          windSpeed: Math.round(Math.random() * 10 + 5),
          description: ['Clear sky', 'Few clouds', 'Scattered clouds', 'Light rain', 'Thunderstorm'][Math.floor(Math.random() * 5)],
          icon: ['01d', '02d', '03d', '10d', '11d'][Math.floor(Math.random() * 5)],
          precipitation: Math.round(Math.random() * 5)
        });
      }
      
      return res.json({ forecast: mockForecast });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`
    );

    // Process 5-day forecast data (every 3 hours) to daily forecast
    const dailyData = {};
    response.data.list.forEach(item => {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          temps: [],
          humidity: [],
          windSpeed: [],
          descriptions: [],
          icons: [],
          precipitation: 0
        };
      }
      
      dailyData[date].temps.push(item.main.temp);
      dailyData[date].humidity.push(item.main.humidity);
      dailyData[date].windSpeed.push(item.wind.speed);
      dailyData[date].descriptions.push(item.weather[0].description);
      dailyData[date].icons.push(item.weather[0].icon);
      if (item.rain) dailyData[date].precipitation += item.rain['3h'] || 0;
    });

    const forecast = Object.keys(dailyData).slice(0, 7).map(date => {
      const data = dailyData[date];
      const dateObj = new Date(date);
      
      return {
        date,
        day: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        temperature: {
          max: Math.round(Math.max(...data.temps)),
          min: Math.round(Math.min(...data.temps))
        },
        humidity: Math.round(data.humidity.reduce((a, b) => a + b) / data.humidity.length),
        windSpeed: Math.round(data.windSpeed.reduce((a, b) => a + b) / data.windSpeed.length),
        description: data.descriptions[0],
        icon: data.icons[0],
        precipitation: Math.round(data.precipitation)
      };
    });

    res.json({ forecast });
  } catch (error) {
    console.error('Weather forecast API error:', error);
    res.status(500).json({ message: 'Failed to fetch weather forecast' });
  }
});

module.exports = router;