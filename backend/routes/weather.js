/**
 * Weather Data API Routes
 * Handles weather data requests for pollen prediction modeling
 */

const express = require('express');
const router = express.Router();
const { getWeatherData, getForecast } = require('../services/weatherService');

// Get current weather data for all regions
router.get('/current', async (req, res) => {
  try {
    const weatherData = await getWeatherData();
    
    res.json({
      success: true,
      data: weatherData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get weather forecast for predictions
router.get('/forecast', async (req, res) => {
  try {
    const { days = 3, regionId } = req.query;
    
    const forecast = await getForecast({
      days: parseInt(days),
      regionId
    });
    
    res.json({
      success: true,
      data: forecast,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forecast',
      timestamp: new Date().toISOString()
    });
  }
});

// Get weather data for specific region
router.get('/region/:regionId', async (req, res) => {
  try {
    const { regionId } = req.params;
    const weatherData = await getWeatherData({ regionId });
    
    res.json({
      success: true,
      data: weatherData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching region weather:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch region weather',
      timestamp: new Date().toISOString()
    });
  }
});

// Get historical weather data
router.get('/historical', async (req, res) => {
  try {
    const { startDate, endDate, regionId } = req.query;
    
    const historicalData = await getWeatherData({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      regionId,
      historical: true
    });
    
    res.json({
      success: true,
      data: historicalData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching historical weather:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical weather',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;