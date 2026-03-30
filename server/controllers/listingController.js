const Listing = require('../models/Listing');

// @desc    Get all active surplus food listings
// @route   GET /api/listings
// @access  Public (or Private depending on your frontend needs)
const getListings = async (req, res) => {
  try {
    // Populating 'vendor' to get the details of the person who posted
    const listings = await Listing.find({ status: 'available' }).populate('vendor', 'name location role');
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new surplus food listing
// @route   POST /api/listings
// @access  Private (Only logged in vendors/restaurants)
const createListing = async (req, res) => {
  try {
    // Grab all the exact fields required by your schema
    const { 
      title, 
      description, 
      originalQuantity, 
      availableQuantity, 
      unit, 
      foodCondition, 
      expiryDateTime, 
      pickupWindowStart, 
      pickupWindowEnd 
    } = req.body;

    const listing = await Listing.create({
      title,
      description,
      originalQuantity,
      availableQuantity,
      unit,
      foodCondition,
      expiryDateTime,
      pickupWindowStart,
      pickupWindowEnd,
      vendor: req.user.id, // Attached from the authMiddleware
    });

    res.status(201).json(listing);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create listing', error: error.message });
  }
};

// @desc    Update a listing (e.g., mark as claimed)
// @route   PUT /api/listings/:id
// @access  Private
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Ensure the logged-in user matches the vendor who created it
    if (listing.vendor.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this listing' });
    }

    const updatedListing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true, 
    });

    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update listing', error: error.message });
  }
};

// @desc    Delete a listing
// @route   DELETE /api/listings/:id
// @access  Private
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Ensure the logged-in user matches the vendor who created it
    if (listing.vendor.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this listing' });
    }

    await listing.deleteOne();
    res.status(200).json({ id: req.params.id, message: 'Listing deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete listing', error: error.message });
  }
};

module.exports = {
  getListings,
  createListing,
  updateListing,
  deleteListing,
};