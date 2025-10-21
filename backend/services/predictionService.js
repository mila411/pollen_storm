/**
 * Prediction Service
 * Communicates with ML model for pollen predictions
 */

const axios = require('axios');

const prefectures = require('../../shared/prefectures.json');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

const PREFECTURE_REGIONS = prefectures.map(region => ({
  id: region.id,
  name: region.name,
  prefecture: region.prefecture
}));

async function getPredictions(type, options = {}) {
  try {
    // Call Python ML service
    const response = await axios.get(`${ML_SERVICE_URL}/predict`, {
      params: options
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching predictions:', error.message);
    // Return mock predictions if ML service is unavailable
    return generateMockPredictions(options);
  }
}

function generateMockPredictions(options = {}) {
  return PREFECTURE_REGIONS.map(region => {
    const score = Math.random() * 100;
    let level;
    if (score < 25) level = 'low';
    else if (score < 50) level = 'moderate';
    else if (score < 75) level = 'high';
    else level = 'very_high';
    
    return {
      prefecture: region.prefecture,
      region: region.name,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      predictedLevel: level,
      confidence: 0.7 + Math.random() * 0.25,
      factors: {
        temperature: 15 + Math.random() * 15,
        humidity: 40 + Math.random() * 40,
        windSpeed: Math.random() * 10,
        historicalTrend: Math.random()
      }
    };
  });
}

async function generatePredictions() {
  return await getPredictions('tomorrow');
}

module.exports = {
  getPredictions,
  generatePredictions,
  generateMockPredictions
};