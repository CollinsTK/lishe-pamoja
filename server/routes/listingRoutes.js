const express = require('express');
const router = express.Router();
const { getListings, createListing, updateListing, deleteListing } = require('../controllers/listingController');
const { protect, requireCapability } = require('../middleware/authMiddleware');

// router.route is a clean way to chain methods for the same URL
router.route('/')
  .get(getListings)
  .post(protect, requireCapability('canSell'), createListing);

router.route('/:id')
  .put(protect, requireCapability('canSell'), updateListing)
  .delete(protect, requireCapability('canSell'), deleteListing);

module.exports = router;