/**
 * PollenStorm AI Backend Server
 * Provides API endpoints for pollen data and predictions
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const pollenRoutes = require('./routes/pollen');
const predictionRoutes = require('./routes/predictions');
const weatherRoutes = require('./routes/weather');
const { startDataCollection } = require('./services/dataCollector');
const { initializeWebSocket } = require('./services/websocket');

const app = express();
const server = http.createServer(app);

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/pollen', pollenRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/weather', weatherRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`🌸 PollenStorm AI Backend running on port ${PORT}`);
  
  // Initialize WebSocket for real-time updates
  initializeWebSocket(server);
  
  // Start data collection services
  startDataCollection();
  
  console.log('📡 Real-time data collection started');
  console.log('🔮 ML prediction service initialized');
});

module.exports = app;