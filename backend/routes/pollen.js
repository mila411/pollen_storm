/**
 * Pollen Data API Routes
 * Handles real-time and historical pollen data requests
 */

const express = require('express');
const router = express.Router();
const { getPollenData, getHistoricalData } = require('../services/pollenService');

// Get current pollen data for all regions
router.get('/current', async (req, res) => {
  try {
    const { regionId, region, refresh } = req.query;
    const data = await getPollenData({
      regionId: regionId || region,
      forceRefresh: refresh === 'true'
    });
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching current pollen data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pollen data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get pollen data for specific region
router.get('/region/:regionId', async (req, res) => {
  try {
    const { regionId } = req.params;
    const { refresh } = req.query;
    const data = await getPollenData({
      regionId,
      forceRefresh: refresh === 'true'
    });
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching region pollen data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch region data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get historical pollen data
router.get('/historical', async (req, res) => {
  try {
    const { startDate, endDate, regionId, refresh } = req.query;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    const data = await getHistoricalData({
      startDate: start,
      endDate: end,
      regionId,
      forceRefresh: refresh === 'true'
    });
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get pollen levels summary
router.get('/summary', async (req, res) => {
  try {
    const data = await getPollenData();
    
    // Calculate summary statistics
    const summary = {
      totalRegions: data.length,
      averageLevel: data.reduce((sum, item) => {
        const levelValues = { low: 1, moderate: 2, high: 3, very_high: 4 };
        return sum + levelValues[item.pollenLevel];
      }, 0) / data.length,
      levelDistribution: {
        low: data.filter(d => d.pollenLevel === 'low').length,
        moderate: data.filter(d => d.pollenLevel === 'moderate').length,
        high: data.filter(d => d.pollenLevel === 'high').length,
        very_high: data.filter(d => d.pollenLevel === 'very_high').length
      },
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;