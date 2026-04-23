const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  logisticsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  fulfillmentMode: {
    type: String,
    enum: ['Pickup', 'Delivery'],
    default: 'Pickup',
  },
  deliveryFee: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: [
      'CLAIMED',
      'LOGISTICS_ASSIGNED',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED'
    ],
    default: 'CLAIMED',
  },
  securityCodes: {
    pickupPin: {
      type: String,
      required: true,
    },
    deliveryPin: {
      type: String,
      required: true,
    },
  },
  timeline: {
    claimedAt: { type: Date, default: Date.now },
    logisticsAcceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  documents: {
    receiptUrl: {
      type: String,
      default: null,
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);