/**
 * Pollen Data Service
 * Handles data collection from external APIs and data processing
 */

const axios = require('axios');

const prefectures = require('../../shared/prefectures.json');

// Mock data for development when ML service is unavailable
const MOCK_REGIONS = prefectures
  .filter(region => typeof region.latitude === 'number' && typeof region.longitude === 'number')
  .map(region => ({
    id: region.id,
    name: region.name,
    prefecture: region.prefecture,
    lat: region.latitude,
    lng: region.longitude
  }));

/**
 * Generate mock pollen data for development
 */
function generateMockPollenData() {
  return MOCK_REGIONS.map(region => {
    // Simulate varying pollen levels based on time and region
    const baseLevel = Math.random() * 100;
    const timeVariation = Math.sin(Date.now() / 3600000) * 20; // Hourly variation
    const pollenCount = Math.max(0, baseLevel + timeVariation);
    
    let pollenLevel;
    if (pollenCount < 10) pollenLevel = 'low';
    else if (pollenCount < 30) pollenLevel = 'moderate';
    else if (pollenCount < 60) pollenLevel = 'high';
    else pollenLevel = 'very_high';
    
    return {
      id: `${region.id}_${Date.now()}`,
      timestamp: new Date(),
      prefecture: region.prefecture,
      region: region.name,
      coordinates: {
        lat: region.lat,
        lng: region.lng
      },
      pollenCount: Math.round(pollenCount),
      pollenLevel,
      weatherData: {
        temperature: 15 + Math.random() * 15, // 15-30°C
        humidity: 40 + Math.random() * 40,    // 40-80%
        windSpeed: Math.random() * 10,        // 0-10 m/s
        windDirection: Math.random() * 360,   // 0-360°
        pressure: 1000 + Math.random() * 50,  // 1000-1050 hPa
        rainfall: Math.random() * 5           // 0-5 mm
      }
    };
  });
}

/**
 * Get current pollen data
 */
async function getPollenData(options = {}) {
  try {
    const params = {};
    if (options.regionId) {
      params.region = options.regionId;
    }
    if (options.forceRefresh) {
      params.refresh = true;
    }

    const response = await axios.get(`${ML_SERVICE_URL}/data/current`, { params });
    const payload = response.data?.data ?? response.data;

    if (Array.isArray(payload) && payload.length > 0) {
      return payload;
    }
    
    return generateMockPollenData();
  } catch (error) {
    console.error('Error fetching pollen data:', error);
    return generateMockPollenData();
  }
}

/**
 * Get historical pollen data
 */
async function getHistoricalData(options) {
  try {
    const { startDate, endDate, regionId } = options;

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (regionId) params.region = regionId;

    const response = await axios.get(`${ML_SERVICE_URL}/historical`, { params });
    const payload = response.data?.data ?? response.data;

    if (Array.isArray(payload) && payload.length > 0) {
      return payload;
    }

    return [];
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

/**
 * Real-time data collection service
 * This would typically run as a background job
 */
function startDataCollection() {
  console.log('📊 Starting pollen data collection service...');
  
  // Collect data every 15 minutes
  setInterval(async () => {
    try {
      const data = await getPollenData();
      console.log(`Collected data for ${data.length} regions`);
      
      // In production, save to database
      // await saveToDatabase(data);
      
      // Broadcast to connected WebSocket clients
      global.wss?.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'pollenUpdate',
            data: data
          }));
        }
      });
      
    } catch (error) {
      console.error('Error in data collection:', error);
    }
  }, 15 * 60 * 1000); // 15 minutes
}

module.exports = {
  getPollenData,
  getHistoricalData,
  startDataCollection
};