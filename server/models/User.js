const mongoose = require('mongoose');

// Define the schema for users in the database.
// This schema stores the user profile and access role.
const userSchema = new mongoose.Schema({
  // Full name of the user.
  name: { type: String, required: true },

  // Email address used for login and communication.
  // Must be unique across all users.
  email: { type: String, required: true, unique: true },

  // Hashed password for authentication.
  password: { type: String, required: true },

  // Role determining the user's access and behavior in the app.
  // Allowed values include the full platform user set.
  role: { type: String, enum: ['vendor', 'recipient', 'logistics', 'admin'], required: true },

  // Phone number for contact and logistics.
  phone: { type: String },

  // Optional location information for the user.
  location: { type: String },

  // Timestamp when the user was created.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);