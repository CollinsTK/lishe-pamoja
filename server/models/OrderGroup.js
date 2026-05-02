const mongoose = require('mongoose');

const orderGroupSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  totalAmount: {
    type: Number,
    required: true,
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
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('OrderGroup', orderGroupSchema);
