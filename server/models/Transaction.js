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
  orderGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrderGroup',
    default: null,
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
  readyForDispatch: {
    type: Boolean,
    default: false,
  },
  deliveryLocation: {
    lat:     { type: Number, default: null },
    lng:     { type: Number, default: null },
    address: { type: String, default: null },
  },
  status: {
    type: String,
    enum: [
      'PENDING_PAYMENT',
      'CLAIMED',
      'AWAITING_RIDER',
      'ASSIGNED',
      'IN_TRANSIT',
      'DELIVERED',
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
    cancelledAt: { type: Date, default: null },
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
      enum: ['mpesa', 'cash', 'card', 'wallet', 'none'],
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
  earnings: {
    vendorGross:     { type: Number, default: 0 },
    vendorNet:       { type: Number, default: 0 },
    riderGross:      { type: Number, default: 0 },
    riderNet:        { type: Number, default: 0 },
    platformFee:     { type: Number, default: 0 },
    settled:         { type: Boolean, default: false },
    settledAt:       { type: Date, default: null },
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