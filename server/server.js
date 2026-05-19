require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const KeepAlive = require('./utils/keepAlive');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    return res.sendStatus(200);
  }
  next();
});

app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/subscription-plans', require('./routes/subscriptionPlanRoutes'));

app.get('/', (req, res) => res.send('Lishe Pamoja API is running'));

// Ping endpoint for keep-alive
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Start keep-alive mechanism if not in development
    if (process.env.NODE_ENV !== 'development') {
      const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
      const keepAlive = new KeepAlive(serverUrl);
      keepAlive.start();
      
      // Graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down gracefully...');
        keepAlive.stop();
        process.exit(0);
      });
    }
  });
});