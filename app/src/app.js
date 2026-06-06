const express = require('express');
const path = require('path');
const { getSystemMetrics } = require('./system');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const DEPLOYED_BY = process.env.DEPLOYED_BY || 'DevOps Pipeline';

// Serve static assets from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Middleware to inject headers or parse JSON if needed
app.use(express.json());

// API endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: NODE_ENV
  });
});

app.get('/api/metrics', (req, res) => {
  const metrics = getSystemMetrics();
  res.status(200).json({
    ...metrics,
    app: {
      version: APP_VERSION,
      environment: NODE_ENV,
      deployedBy: DEPLOYED_BY
    }
  });
});

// For any other routes, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`🚀 CloudDeploy App running on port ${PORT}`);
    console.log(`🌐 Environment: ${NODE_ENV}`);
    console.log(`📦 Version: ${APP_VERSION}`);
    console.log(`👤 Deployed By: ${DEPLOYED_BY}`);
    console.log('=========================================');
  });
}

module.exports = app;
