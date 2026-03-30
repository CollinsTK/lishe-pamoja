const express = require('express');
const router = express.Router();
const { getListings, createListing, updateListing, deleteListing } = require('../controllers/listingController');
const { protect } = require('../middleware/authMiddleware');

// router.route is a clean way to chain methods for the same URL
router.route('/')
  .get(getListings)         // Anyone can view listings
  .post(protect, createListing); // Must be logged in to post

router.route('/:id')
  .put(protect, updateListing)    // Must be logged in to update
  .delete(protect, deleteListing); // Must be logged in to delete

module.exports = router;