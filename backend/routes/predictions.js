/**
 * Prediction API Routes
 * Handles AI-powered pollen prediction requests
 */

const express = require('express');
const router = express.Router();
const { getPredictions, generatePredictions } = require('../services/predictionService');

// Get predictions for tomorrow
router.get('/tomorrow', async (req, res) => {
  try {
    const predictions = await getPredictions('tomorrow');
    
    res.json({
      success: true,
      data: predictions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching tomorrow predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictions',
      timestamp: new Date().toISOString()
    });
  }
});

// Get predictions for specific date range
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate, regionId } = req.query;
    
    const predictions = await getPredictions('range', {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      regionId
    });
    
    res.json({
      success: true,
      data: predictions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching range predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch range predictions',
      timestamp: new Date().toISOString()
    });
  }
});

// Get prediction for specific region
router.get('/region/:regionId', async (req, res) => {
  try {
    const { regionId } = req.params;
    const { days = 1 } = req.query;
    
    const predictions = await getPredictions('region', {
      regionId,
      days: parseInt(days)
    });
    
    res.json({
      success: true,
      data: predictions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching region predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch region predictions',
      timestamp: new Date().toISOString()
    });
  }
});

// Trigger manual prediction update (for development/testing)
router.post('/update', async (req, res) => {
  try {
    const result = await generatePredictions();
    
    res.json({
      success: true,
      data: result,
      message: 'Predictions updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update predictions',
      timestamp: new Date().toISOString()
    });
  }
});

// Get model performance metrics
router.get('/metrics', async (req, res) => {
  try {
    // This would typically come from ML service
    const metrics = {
      accuracy: 0.87,
      precision: 0.84,
      recall: 0.89,
      f1Score: 0.86,
      lastTraining: '2024-10-19T10:30:00Z',
      modelVersion: '1.2.0',
      dataPoints: 150000
    };
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;