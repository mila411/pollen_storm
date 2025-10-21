/**
 * Data Collector Service
 * Manages periodic data collection from external sources
 */

const cron = require('node-cron');
const { getPollenData } = require('./pollenService');
const { generatePredictions } = require('./predictionService');
const { broadcastPredictionUpdate } = require('./websocket');

function startDataCollection() {
  console.log('📊 Initializing data collection service...');
  
  // Collect pollen data every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('🌸 Collecting pollen data...');
      const data = await getPollenData();
      console.log(`✓ Collected data for ${data.length} regions`);
    } catch (error) {
      console.error('Error collecting pollen data:', error);
    }
  });
  
  // Update predictions every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔮 Updating predictions...');
      const predictions = await generatePredictions();
      broadcastPredictionUpdate(predictions);
      console.log('✓ Predictions updated');
    } catch (error) {
      console.error('Error updating predictions:', error);
    }
  });
  
  console.log('✓ Data collection service started');
}

module.exports = {
  startDataCollection
};