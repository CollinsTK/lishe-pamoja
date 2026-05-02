const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  claimListing,
  checkoutCart,
  acceptDispatch,
  verifyPickup,
  verifyDelivery,
  cancelTransaction,
  initiatePayment,
  checkPaymentStatus,
  processPayout,
  handlePaymentCallback,
  handlePayoutCallback,
  getTransactions,
  getAllTransactions,
} = require('../controllers/transactionController');

const router = express.Router();

router.post('/claim', protect, claimListing);
router.post('/checkout', protect, checkoutCart);
router.put('/:id/accept', protect, acceptDispatch);
router.put('/:id/verify-pickup', protect, verifyPickup);
router.put('/:id/verify-delivery', protect, verifyDelivery);
router.put('/:id/cancel', protect, cancelTransaction);

router.get('/', protect, getTransactions);
router.get('/all', protect, getAllTransactions);

// Payment routes
router.post('/payment/initiate', protect, initiatePayment);
router.get('/payment/status/:checkoutRequestId', checkPaymentStatus);
router.post('/payment/callback', handlePaymentCallback);

// Payout routes (admin/logistics only)
router.post('/payout', protect, processPayout);
router.post('/payout/callback', handlePayoutCallback);

module.exports = router;