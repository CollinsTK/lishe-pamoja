const mongoose = require('mongoose');

/**
 * Subscription Plan Model
 * Admin-configurable subscription plans with pricing, duration, and capabilities
 */
const subscriptionPlanSchema = new mongoose.Schema({
  // Auto-generated unique plan ID (e.g., plan_abc12345)
  planId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // Plan display name
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Plan description
  description: {
    type: String,
    trim: true,
    default: '',
  },
  
  // Price in KES
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Duration type: monthly, quarterly, yearly
  durationType: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly'],
  },
  
  // Calculated duration in days
  durationDays: {
    type: Number,
    required: true,
    default: function() {
      const daysMap = {
        monthly: 30,
        quarterly: 90,
        yearly: 365,
      };
      return daysMap[this.durationType] || 30;
    },
  },
  
  // Capabilities granted by this plan
  capabilities: {
    canSell: {
      type: Boolean,
      default: false,
    },
    canDeliver: {
      type: Boolean,
      default: false,
    },
  },
  
  // Features list for display
  features: [{
    type: String,
    trim: true,
  }],
  
  // Usage limits
  limits: {
    listings: {
      type: Number,
      default: 0, // -1 for unlimited
    },
    deliveries: {
      type: Number,
      default: 0, // -1 for unlimited
    },
  },
  
  // Whether this plan is active and available for purchase
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Plan creation/update timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
subscriptionPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Recalculate durationDays if durationType changed
  const daysMap = {
    monthly: 30,
    quarterly: 90,
    yearly: 365,
  };
  this.durationDays = daysMap[this.durationType] || 30;
  
  next();
});

// Static method to generate unique plan ID
subscriptionPlanSchema.statics.generatePlanId = function() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'plan_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Instance method to check if plan is free
subscriptionPlanSchema.methods.isFree = function() {
  return this.price === 0;
};

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
