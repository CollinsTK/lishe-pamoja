const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  claimListing,
  checkoutCart,
  acceptDispatch,
  verifyPickup,
  verifyDelivery,
  cancelTransaction,
  markReadyForDispatch,
  getAvailableDispatches,
  getRiderDispatches,
  initiatePayment,
  checkPaymentStatus,
  processPayout,
  handlePaymentCallback,
  handlePayoutCallback,
  getTransactions,
  getVendorTransactions,
  getAllTransactions,
  priceDelivery,
  getAdminEarnings,
  getRiderEarnings,
  checkOrderPaymentStatus,
} = require('../controllers/transactionController');

const router = express.Router();

router.post('/claim', protect, claimListing);
router.post('/checkout', protect, checkoutCart);

router.get('/', protect, getTransactions);
router.get('/vendor', protect, getVendorTransactions);
router.get('/available-dispatches', protect, getAvailableDispatches);
router.get('/rider-dispatches', protect, getRiderDispatches);
router.get('/all', protect, getAllTransactions);

router.put('/:id/accept', protect, acceptDispatch);
router.put('/:id/verify-pickup', protect, verifyPickup);
router.put('/:id/verify-delivery', protect, verifyDelivery);
router.put('/:id/cancel', protect, cancelTransaction);
router.put('/:id/ready-for-dispatch', protect, markReadyForDispatch);

// Payment routes
router.post('/payment/initiate', protect, initiatePayment);
router.get('/payment/status/:checkoutRequestId', checkPaymentStatus);
router.post('/payment/callback', handlePaymentCallback);

// Payout routes (admin/logistics only)
router.post('/payout', protect, processPayout);
router.post('/payout/callback', handlePayoutCallback);

// Delivery pricing
router.get('/price-delivery', protect, priceDelivery);

// Admin earnings
router.get('/admin/earnings', protect, getAdminEarnings);

// Rider earnings
router.get('/rider/earnings', protect, getRiderEarnings);

// Order group payment status poll
router.get('/order-group/:id/payment-status', protect, checkOrderPaymentStatus);

module.exports = router;