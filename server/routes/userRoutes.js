const express = require('express');
const router = express.Router();

// Import the brain (the controller function we just wrote)
const { registerUser } = require('../controllers/userController');

// Define the route: When a POST request hits '/register', run the controller
router.post('/register', registerUser);

module.exports = router;