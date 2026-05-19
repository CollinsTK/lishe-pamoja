const express = require('express');
const router = express.Router();
const { 
  getListings, 
  getListingById, 
  getVendorListings, 
  getMyListings, 
  createListing, 
  updateListing, 
  updateListingQuantity, 
  deleteListing, 
  getListingStats 
} = require('../controllers/listingController');
const { protect, requireCapability } = require('../middleware/authMiddleware');

// Public routes
router.route('/')
  .get(getListings)
  .post(protect, requireCapability('canSell'), createListing);

router.route('/stats')
  .get(protect, requireCapability('canSell'), getListingStats);

router.route('/my')
  .get(protect, requireCapability('canSell'), getMyListings);

router.route('/vendor/:vendorId')
  .get(getVendorListings);

router.route('/:id')
  .get(getListingById)
  .put(protect, requireCapability('canSell'), updateListing)
  .delete(protect, requireCapability('canSell'), deleteListing);

router.route('/:id/quantity')
  .patch(updateListingQuantity);

module.exports = router;