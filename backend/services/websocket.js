/**
 * WebSocket Service
 * Handles real-time communication with frontend clients
 */

const WebSocket = require('ws');

let wss;

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(server) {
  wss = new WebSocket.Server({ server });
  global.wss = wss;

  wss.on('connection', (ws, req) => {
    console.log(`🔌 New WebSocket connection from ${req.socket.remoteAddress}`);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to PollenStorm AI real-time updates',
      timestamp: new Date().toISOString()
    }));

    // Handle client messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket connection closed: ${code} ${reason}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send initial data
    sendInitialData(ws);
  });

  console.log('🔌 WebSocket server initialized');
}

/**
 * Handle incoming client messages
 */
function handleClientMessage(ws, data) {
  switch (data.type) {
    case 'subscribe':
      // Subscribe to specific region updates
      ws.subscriptions = ws.subscriptions || [];
      if (data.regionId && !ws.subscriptions.includes(data.regionId)) {
        ws.subscriptions.push(data.regionId);
        ws.send(JSON.stringify({
          type: 'subscribed',
          regionId: data.regionId,
          timestamp: new Date().toISOString()
        }));
      }
      break;

    case 'unsubscribe':
      // Unsubscribe from region updates
      if (ws.subscriptions && data.regionId) {
        ws.subscriptions = ws.subscriptions.filter(id => id !== data.regionId);
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          regionId: data.regionId,
          timestamp: new Date().toISOString()
        }));
      }
      break;

    case 'ping':
      // Respond to ping with pong
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${data.type}`,
        timestamp: new Date().toISOString()
      }));
  }
}

/**
 * Send initial data to newly connected clients
 */
async function sendInitialData(ws) {
  try {
    const { getPollenData } = require('./pollenService');
    const { getPredictions } = require('./predictionService');
    
    // Send current pollen data
    const pollenData = await getPollenData();
    ws.send(JSON.stringify({
      type: 'initialPollenData',
      data: pollenData,
      timestamp: new Date().toISOString()
    }));

    // Send current predictions
    const predictions = await getPredictions('tomorrow');
    ws.send(JSON.stringify({
      type: 'initialPredictions',
      data: predictions,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error sending initial data:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to load initial data',
      timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Broadcast data to all connected clients
 */
function broadcast(data) {
  if (!wss) return;

  const message = JSON.stringify(data);
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      // Check if client is subscribed to this update
      if (data.regionId && client.subscriptions) {
        if (!client.subscriptions.includes(data.regionId)) {
          return; // Skip this client
        }
      }
      
      client.send(message);
    }
  });
}

/**
 * Send particle storm data for 3D visualization
 */
function broadcastParticleData(particleData) {
  broadcast({
    type: 'particleUpdate',
    data: particleData,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send prediction updates
 */
function broadcastPredictionUpdate(predictions) {
  broadcast({
    type: 'predictionUpdate',
    data: predictions,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  initializeWebSocket,
  broadcast,
  broadcastParticleData,
  broadcastPredictionUpdate
};