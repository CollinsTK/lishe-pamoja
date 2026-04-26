const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  getUserProfile,
  getSubscriptionPlans,
  subscribeToPlan,
  upgradePlan,
  checkSubscriptionStatus,
  cancelSubscription,
  setupPayoutAccount,
  verifyPayoutAccount,
  handleSubscriptionCallback,
} = require('../controllers/userController');

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getUserProfile);

// Subscription routes
router.get('/subscription/plans', protect, getSubscriptionPlans);
router.post('/subscription/subscribe', protect, subscribeToPlan);
router.post('/subscription/upgrade', protect, upgradePlan);
router.get('/subscription/status', protect, checkSubscriptionStatus);
router.post('/subscription/cancel', protect, cancelSubscription);
router.post('/subscription/callback', handleSubscriptionCallback);

// Payout routes (vendors/logistics)
router.post('/payout/setup', protect, setupPayoutAccount);
router.post('/payout/verify', protect, verifyPayoutAccount);

module.exports = router;