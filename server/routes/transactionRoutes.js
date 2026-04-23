const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  claimListing,
  acceptDispatch,
  verifyPickup,
  verifyDelivery,
} = require('../controllers/transactionController');

const router = express.Router();

router.post('/claim', protect, claimListing);
router.put('/:id/accept', protect, acceptDispatch);
router.put('/:id/verify-pickup', protect, verifyPickup);
router.put('/:id/verify-delivery', protect, verifyDelivery);

module.exports = router;