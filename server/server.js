const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware to parse incoming JSON data from HTTP requests
app.use(express.json());

// Simple CORS support to allow the client app to call the API during development.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    return res.sendStatus(200);
  }
  next();
});

// Import the user routes 
const userRoutes = require('./routes/userRoutes');
const listingRoutes = require('./routes/listingRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/transactions', transactionRoutes);

// A simple base route to verify the API is running
app.get('/', (req, res) => {
  res.send('Welcome to the Lishe Pamoja API!');
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; 

// Connect to MongoDB before starting the server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to the database');
    // Start listening for requests only after the database connects
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
  });