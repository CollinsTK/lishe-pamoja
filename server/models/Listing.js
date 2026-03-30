const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  // Who posted this? (Links directly to your User database)
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Basic Info
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  // EDGE CASE 1: Partial Claims
  originalQuantity: { type: Number, required: true },
  availableQuantity: { type: Number, required: true }, // This shrinks as people claim food
  unit: { type: String, required: true }, // e.g., 'loaves', 'kgs', 'plates'
  
  // EDGE CASE 2: Food Safety & Dietary Tags
  dietaryTags: [{ type: String }], // Array of strings e.g., ['Vegan', 'Nut-Free']
  foodCondition: { 
    type: String, 
    enum: ['Cooked', 'Raw Produce', 'Packaged'], 
    required: true 
  },
  
  // Logistics
  expiryDateTime: { type: Date, required: true },
  pickupWindowStart: { type: Date, required: true },
  pickupWindowEnd: { type: Date, required: true },
  isFree: { type: Boolean, default: true },
  
  // Auto-updates based on availableQuantity
  status: { 
    type: String, 
    enum: ['available', 'partially_claimed', 'fully_claimed', 'expired'], 
    default: 'available' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', listingSchema);