const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile,
  getSubscriptionPlans,
  subscribeToPlan,
  changePlan,
  checkSubscriptionStatus,
  cancelSubscription,
  setupPayoutAccount,
  verifyPayoutAccount,
  handleSubscriptionCallback,
  checkMpesaPaymentStatus,
  getAllUsers,
  adminUpdateUser,
  adminDeleteUser,
  walletTopup,
  walletTopupCallback,
  walletTopupStatus,
} = require('../controllers/userController');

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getUserProfile);
router.put('/me', protect, updateProfile);
router.get('/', protect, getAllUsers);

// Subscription routes
router.get('/subscription/plans', protect, getSubscriptionPlans);
router.post('/subscription/subscribe', protect, subscribeToPlan);
router.post('/subscription/change', protect, changePlan);
router.get('/subscription/status', protect, checkSubscriptionStatus);
router.post('/subscription/cancel', protect, cancelSubscription);
router.post('/subscription/callback', handleSubscriptionCallback);
router.get('/subscription/mpesa-status', protect, checkMpesaPaymentStatus);

// Admin user management routes
router.put('/admin/:id', protect, adminUpdateUser);
router.delete('/admin/:id', protect, adminDeleteUser);

// Wallet top-up routes
router.post('/wallet/topup', protect, walletTopup);
router.post('/wallet/topup/callback', walletTopupCallback);
router.get('/wallet/topup/status/:checkoutRequestId', protect, walletTopupStatus);

// Payout routes (vendors/logistics)
router.post('/payout/setup', protect, setupPayoutAccount);
router.post('/payout/verify', protect, verifyPayoutAccount);

module.exports = router;