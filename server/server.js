const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware to parse incoming JSON data from HTTP requests
app.use(express.json());

// Import the user routes 
const userRoutes = require('./routes/userRoutes');

// Mount the user routes to the /api/users path
// Now, any request to /api/users/... will be handled by userRoutes
app.use('/api/users', userRoutes);

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