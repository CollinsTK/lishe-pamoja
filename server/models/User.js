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

  // DEPRECATED: Legacy role field - being replaced by capabilities
  // Kept for migration purposes, defaults to 'recipient' for new users
  role: { type: String, enum: ['vendor', 'recipient', 'logistics', 'admin', 'user'], default: 'user' },

  // User capabilities - determine what features user can access
  capabilities: {
    canBrowse: { type: Boolean, default: true },    // View listings, claim/purchase
    canSell: { type: Boolean, default: false },     // Create listings, manage vendor orders
    canDeliver: { type: Boolean, default: false },   // Accept delivery dispatches
  },

  // Admin flag - separate from capabilities, manually assigned
  isAdmin: { type: Boolean, default: false },

  // Phone number for contact and logistics.
  phone: { type: String },

  // Optional location information for the user (coordinates + address)
  location: {
    lat:     { type: Number, default: null },
    lng:     { type: Number, default: null },
    address: { type: String, default: null },
  },

  // Subscription fields
  subscription: {
    plan: {
      type: String,
      default: 'free', // Can be 'free' or any custom planId like 'plan_abc123'
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'expired', 'cancelled', 'suspended'],
      default: 'active',
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    autoRenew: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'mpesa', null],
      default: null,
    },
    mpesaCheckoutRequestId: { type: String, default: null },
    mpesaReceiptNumber: { type: String, default: null },
  },

  // Subscription history for tracking past subscriptions
  subscriptionHistory: [{
    plan: { type: String, required: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: ['wallet', 'mpesa'] },
    amount: { type: Number },
    mpesaReceiptNumber: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],

  // Payment history for subscriptions
  paymentHistory: [{
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    amount: { type: Number },
    plan: { type: String },
    mpesaReceiptNumber: { type: String },
    paidAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['completed', 'failed', 'refunded'] },
  }],

  // Payout settings (for vendors/logistics to receive payments)
  payoutSettings: {
    mpesaPhone: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
  },

  // User wallet balance for purchasing/receiving funds
  walletBalance: { type: Number, default: 0 },

  // Pending M-Pesa wallet top-up (cleared by callback)
  pendingTopup: {
    checkoutRequestId: String,
    merchantRequestId: String,
    amount: Number,
    phone: String,
    initiatedAt: Date,
  },

  // Timestamp when the user was created.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);