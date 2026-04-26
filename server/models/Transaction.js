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
  payment: {
    method: {
      type: String,
      enum: ['mpesa', 'cash', 'card', 'none'],
      default: 'none',
    },
    mpesaReceiptNumber: {
      type: String,
      default: null,
    },
    checkoutRequestId: {
      type: String,
      default: null,
    },
    merchantRequestId: {
      type: String,
      default: null,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  payout: {
    vendorAmount: {
      type: Number,
      default: null,
    },
    logisticsAmount: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    b2cConversationId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);