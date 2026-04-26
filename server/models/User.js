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

  // Subscription fields
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'expired', 'cancelled', 'suspended'],
      default: 'active',
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    autoRenew: { type: Boolean, default: false },
    mpesaCheckoutRequestId: { type: String, default: null },
    mpesaReceiptNumber: { type: String, default: null },
  },

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

  // Timestamp when the user was created.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);