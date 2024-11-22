require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const fs = require('fs');

const app = express();

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Enable CORS for your frontend domain
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Origin', 'User-Agent'],
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Proxy middleware configuration
const proxyConfig = {
  target: 'https://interface.gateway.uniswap.org',
  changeOrigin: true,
  pathRewrite: {
    '^/v2': '/v2'
  },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('Origin', '*');
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.110 Safari/537.36');
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(500).json({ error: 'Proxy Error', message: err.message });
  }
};

app.use('/v2', createProxyMiddleware(proxyConfig));

const PORT = process.env.PORT || 3001;

// Check if SSL certificates exist
if (process.env.NODE_ENV === 'production' && fs.existsSync('./ssl/privkey.pem') && fs.existsSync('./ssl/fullchain.pem')) {
  const httpsOptions = {
    key: fs.readFileSync('./ssl/privkey.pem'),
    cert: fs.readFileSync('./ssl/fullchain.pem')
  };
  
  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`Secure proxy server running on port ${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
  });
}