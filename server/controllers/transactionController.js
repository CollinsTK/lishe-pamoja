const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { generateReceiptUrl } = require('../utils/receiptGenerator');
const MpesaService = require('../services/mpesaService');

// Initialize M-Pesa service with config from environment
const mpesaService = new MpesaService({
  environment: process.env.MPESA_ENV || 'sandbox',
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  initiatorName: process.env.MPESA_INITIATOR_NAME,
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
});

const generatePIN = () => Math.floor(1000 + Math.random() * 9000).toString();

const claimListing = async (req, res) => {
  try {
    const {
      listingId,
      quantity = 1,
      fulfillmentMode = 'Pickup',
      deliveryFee = 0,
    } = req.body;

    const recipientId = req.user?.id;
    if (!recipientId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!listingId) {
      return res.status(400).json({ success: false, message: 'listingId is required' });
    }

    const listing = await Listing.findOne({
      _id: listingId,
      status: { $in: ['available', 'partially_claimed'] },
      availableQuantity: { $gte: quantity },
    });

    if (!listing) {
      return res.status(400).json({ success: false, message: 'Listing unavailable or insufficient quantity' });
    }

    const pickupPin = generatePIN();
    const deliveryPin = generatePIN();

    const remainingQuantity = listing.availableQuantity - quantity;
    listing.availableQuantity = remainingQuantity;
    listing.status = remainingQuantity === 0 ? 'fully_claimed' : 'partially_claimed';
    await listing.save();

    const transaction = await Transaction.create({
      listingId,
      vendorId: listing.vendor,
      recipientId,
      quantity,
      fulfillmentMode,
      deliveryFee,
      status: 'CLAIMED',
      securityCodes: {
        pickupPin,
        deliveryPin,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Listing claimed successfully. Waiting for logistics.',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const acceptDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const logisticsId = req.body.logisticsId || req.user?.id;

    if (!logisticsId) {
      return res.status(401).json({ success: false, message: 'Logistics partner authentication required' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'CLAIMED') {
      return res.status(400).json({ success: false, message: 'Transaction is not available for dispatch acceptance' });
    }

    transaction.logisticsId = logisticsId;
    transaction.status = 'LOGISTICS_ASSIGNED';
    transaction.timeline.logisticsAcceptedAt = Date.now();
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Dispatch accepted successfully.',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const verifyPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'LOGISTICS_ASSIGNED') {
      return res.status(400).json({ success: false, message: 'Transaction is not ready for pickup verification' });
    }
    if (transaction.securityCodes.pickupPin !== pin) {
      return res.status(400).json({ success: false, message: 'Invalid Pickup PIN' });
    }

    transaction.status = 'IN_TRANSIT';
    transaction.timeline.pickedUpAt = Date.now();
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Pickup verified. Food is now in transit.',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const verifyDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'IN_TRANSIT') {
      return res.status(400).json({ success: false, message: 'Transaction is not in transit' });
    }
    if (transaction.securityCodes.deliveryPin !== pin) {
      return res.status(400).json({ success: false, message: 'Invalid Delivery PIN' });
    }

    transaction.status = 'DELIVERED';
    transaction.timeline.deliveredAt = Date.now();
    await transaction.save();

    transaction.status = 'COMPLETED';
    transaction.timeline.completedAt = Date.now();
    transaction.documents.receiptUrl = await generateReceiptUrl(transaction);
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Delivery verified. Transaction complete.',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  claimListing,
  acceptDispatch,
  verifyPickup,
  verifyDelivery,
  initiatePayment,
  checkPaymentStatus,
  processPayout,
  handlePaymentCallback,
  handlePayoutCallback,
};

// ============== Payment Functions ==============

/**
 * Initiate M-Pesa STK Push payment
 */
async function initiatePayment(req, res) {
  try {
    const { transactionId, phoneNumber, amount } = req.body;
    const recipientId = req.user?.id;

    if (!recipientId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!transactionId || !phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: 'transactionId, phoneNumber, and amount are required' });
    }

    // Validate phone number
    if (!mpesaService.isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const transaction = await Transaction.findOne({
      _id: transactionId,
      recipientId,
      payment: { status: { $in: ['pending', 'failed'] } },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found or already paid' });
    }

    const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
    const callBackUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/transactions/payment/callback`;

    const result = await mpesaService.initiateSTKPush({
      phone: formattedPhone,
      amount: amount || transaction.deliveryFee,
      accountReference: `LP${transaction._id}`,
      transactionDesc: `Lishe Pamoja - Transaction ${transaction._id}`,
      callBackUrl,
    });

    // Update transaction with payment details
    transaction.payment = {
      method: 'mpesa',
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
      phoneNumber: formattedPhone,
      amount: amount || transaction.deliveryFee,
      status: 'pending',
    };
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payment initiated. Please enter your PIN on your phone.',
      data: {
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
        amount: amount || transaction.deliveryFee,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment Error', error: error.message });
  }
}

/**
 * Check payment status
 */
async function checkPaymentStatus(req, res) {
  try {
    const { checkoutRequestId } = req.params;

    if (!checkoutRequestId) {
      return res.status(400).json({ success: false, message: 'checkoutRequestId is required' });
    }

    const result = await mpesaService.checkSTKStatus(checkoutRequestId);

    // If payment is complete, update transaction
    if (result.resultCode === 0) {
      const transaction = await Transaction.findOne({
        'payment.checkoutRequestId': checkoutRequestId,
      });

      if (transaction) {
        transaction.payment.status = 'completed';
        transaction.payment.paidAt = new Date();
        await transaction.save();
      }
    }

    res.status(200).json({
      success: true,
      resultCode: result.resultCode,
      resultDesc: result.resultDesc,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Status Check Error', error: error.message });
  }
}

/**
 * Process payout to vendor/logistics (B2C)
 */
async function processPayout(req, res) {
  try {
    const { transactionId, recipientType = 'vendor' } = req.body;
    const initiatorId = req.user?.id;

    // Only admins or logistics can trigger payouts
    if (!initiatorId || !['admin', 'logistics'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to process payouts' });
    }

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId is required' });
    }

    const transaction = await Transaction.findById(transactionId)
      .populate('vendorId')
      .populate('logisticsId');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.payment?.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Transaction payment not completed' });
    }

    if (transaction.payout?.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Payout already processed' });
    }

    const callBackUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/transactions/payout/callback`;

    // Calculate payout amounts (you can adjust the percentage)
    const vendorAmount = transaction.listingId?.price ? transaction.listingId.price * transaction.quantity * 0.85 : 0; // 85% to vendor
    const logisticsAmount = transaction.deliveryFee || 0;

    const results = {};

    // Pay vendor if amount > 0 and they have verified payout settings
    if (vendorAmount > 0 && transaction.vendorId?.payoutSettings?.isVerified && transaction.vendorId.payoutSettings.mpesaPhone) {
      const vendorPhone = mpesaService.formatPhoneNumber(transaction.vendorId.payoutSettings.mpesaPhone);
      results.vendor = await mpesaService.sendB2CPayment({
        phone: vendorPhone,
        amount: vendorAmount,
        commandId: 'BusinessPayment',
        occasion: 'Vendor Payout',
        callBackUrl,
      });
    } else if (vendorAmount > 0 && transaction.vendorId?.phone) {
      // Fallback to primary phone if payout not set up
      console.log(`Vendor ${transaction.vendorId._id} has no verified payout account. Holding vendor payment.`);
      results.vendor = { status: 'pending', message: 'Vendor payout account not verified' };
    }

    // Pay logistics if amount > 0 and they have verified payout settings
    if (logisticsAmount > 0 && transaction.logisticsId?.payoutSettings?.isVerified && transaction.logisticsId.payoutSettings.mpesaPhone) {
      const logisticsPhone = mpesaService.formatPhoneNumber(transaction.logisticsId.payoutSettings.mpesaPhone);
      results.logistics = await mpesaService.sendB2CPayment({
        phone: logisticsPhone,
        amount: logisticsAmount,
        commandId: 'BusinessPayment',
        occasion: 'Logistics Payout',
        callBackUrl,
      });
    } else if (logisticsAmount > 0 && transaction.logisticsId?.phone) {
      // Fallback to primary phone if payout not set up
      console.log(`Logistics ${transaction.logisticsId._id} has no verified payout account. Holding logistics payment.`);
      results.logistics = { status: 'pending', message: 'Logistics payout account not verified' };
    }

    // Update transaction with payout details
    transaction.payout = {
      vendorAmount,
      logisticsAmount,
      status: results.vendor?.conversationId || results.logistics?.conversationId ? 'processing' : 'pending',
      b2cConversationId: results.vendor?.conversationId || results.logistics?.conversationId,
    };
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payout initiated successfully.',
      data: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payout Error', error: error.message });
  }
}

/**
 * Handle M-Pesa payment callback (STK Push)
 */
async function handlePaymentCallback(req, res) {
  try {
    const body = req.body;
    console.log('M-Pesa Payment Callback:', JSON.stringify(body));

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      Amount,
      MpesaReceiptNumber,
      PhoneNumber,
    } = body;

    // Find transaction by checkout request ID
    const transaction = await Transaction.findOne({
      'payment.merchantRequestId': MerchantRequestID,
      'payment.checkoutRequestId': CheckoutRequestID,
    });

    if (!transaction) {
      console.error('Transaction not found for callback:', MerchantRequestID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
    }

    if (ResultCode === 0) {
      // Payment successful
      transaction.payment.status = 'completed';
      transaction.payment.mpesaReceiptNumber = MpesaReceiptNumber;
      transaction.payment.paidAt = new Date();
    } else {
      // Payment failed
      transaction.payment.status = 'failed';
      console.error('Payment failed:', ResultDesc);
    }

    await transaction.save();

    // Respond to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  } catch (error) {
    console.error('Callback Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  }
}

/**
 * Handle M-Pesa B2C payout callback
 */
async function handlePayoutCallback(req, res) {
  try {
    const body = req.body;
    console.log('M-Pesa Payout Callback:', JSON.stringify(body));

    const {
      ConversationID,
      OriginatorConversationID,
      ResultCode,
      ResultDesc,
    } = body;

    // Find transaction by conversation ID
    const transaction = await Transaction.findOne({
      'payout.b2cConversationId': { $in: [ConversationID, OriginatorConversationID] },
    });

    if (!transaction) {
      console.error('Transaction not found for payout callback:', ConversationID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
    }

    if (ResultCode === 0) {
      // Payout successful
      transaction.payout.status = 'completed';
      transaction.payout.paidAt = new Date();
    } else {
      // Payout failed
      transaction.payout.status = 'failed';
      console.error('Payout failed:', ResultDesc);
    }

    await transaction.save();

    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  } catch (error) {
    console.error('Payout Callback Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  }
}