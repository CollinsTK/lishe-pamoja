const Listing = require('../models/Listing');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// @desc    Get all active surplus food listings with filtering and pagination
// @route   GET /api/listings
// @access  Public
const getListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      foodCondition,
      minPrice,
      maxPrice,
      isFree,
      location,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { status: { $in: ['available', 'partially_claimed'] } };

    if (category) query.category = category;
    if (foodCondition) query.foodCondition = foodCondition;
    if (isFree !== undefined) query.isFree = isFree === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) query.price.$lte = parseFloat(maxPrice);
    }

    // Location-based filtering (if lat/lng provided)
    if (location) {
      const { lat, lng, radius = 10 } = JSON.parse(location);
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await Listing.find(query)
      .populate('vendor', 'name location role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(query);

    res.status(200).json({
      listings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single listing by ID
// @route   GET /api/listings/:id
// @access  Public
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('vendor', 'name location role phone');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get vendor's listings
// @route   GET /api/listings/vendor/:vendorId
// @access  Public
const getVendorListings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const query = { vendor: vendorId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await Listing.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(query);

    res.status(200).json({
      listings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user's listings
// @route   GET /api/listings/my
// @access  Private
const getMyListings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = { vendor: req.user.id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await Listing.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(query);

    res.status(200).json({
      listings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new surplus food listing
// @route   POST /api/listings
// @access  Private (Only logged in vendors/restaurants)
const createListing = async (req, res) => {
  try {
    // Frontend sends slightly different field names than what the backend originally expected.
    // Map them properly.
    const { 
      title, 
      description, 
      quantity, 
      originalQuantity,
      availableQuantity,
      unit, 
      foodCondition, 
      expiryDateTime, 
      pickupStart,
      pickupWindowStart,
      pickupEnd,
      pickupWindowEnd,
      price,
      category,
      images,
      deliveryAllowed,
      location,
      isFree,
    } = req.body;

    const expiryDate = new Date(expiryDateTime);
    if (!expiryDateTime || isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Expiry date must be a valid future date and time.' });
    }

    const pickupStartDate = pickupWindowStart
      ? new Date(pickupWindowStart)
      : new Date(`${expiryDateTime.split('T')[0]}T${pickupStart || '08:00'}`);
    const pickupEndDate = pickupWindowEnd
      ? new Date(pickupWindowEnd)
      : new Date(`${expiryDateTime.split('T')[0]}T${pickupEnd || '18:00'}`);

    const listing = await Listing.create({
      title,
      description,
      originalQuantity: originalQuantity || quantity,
      availableQuantity: availableQuantity || quantity,
      unit,
      foodCondition: foodCondition || 'Packaged',
      expiryDateTime: expiryDate,
      pickupWindowStart: pickupStartDate,
      pickupWindowEnd: pickupEndDate,
      price: price || 0,
      category,
      images: images || [],
      deliveryAllowed: deliveryAllowed || false,
      location,
      isFree: isFree !== undefined ? isFree : (price === 0),
      vendor: req.user.id, // Attached from the authMiddleware
    });

    res.status(201).json(listing);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create listing', error: error.message });
  }
};

// @desc    Update a listing with partial updates support
// @route   PUT /api/listings/:id
// @access  Private
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Ensure the logged-in user matches the vendor who created it
    if (listing.vendor.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this listing' });
    }

    // Validate dates if provided
    if (req.body.expiryDateTime) {
      const expiryDate = new Date(req.body.expiryDateTime);
      if (isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: 'Expiry date must be a valid future date and time.' });
      }
      req.body.expiryDateTime = expiryDate;
    }

    // Handle pickup window updates
    if (req.body.pickupWindowStart) {
      req.body.pickupWindowStart = new Date(req.body.pickupWindowStart);
    }
    if (req.body.pickupWindowEnd) {
      req.body.pickupWindowEnd = new Date(req.body.pickupWindowEnd);
    }

    // Prevent updating certain fields that should remain immutable
    const allowedUpdates = [
      'title', 'description', 'originalQuantity', 'availableQuantity', 'unit',
      'foodCondition', 'expiryDateTime', 'pickupWindowStart', 'pickupWindowEnd',
      'price', 'category', 'images', 'deliveryAllowed', 'location', 'isFree'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Auto-update isFree based on price
    if (updates.price !== undefined) {
      updates.isFree = updates.price === 0;
    }

    // Update listing status based on available quantity
    if (updates.availableQuantity !== undefined) {
      const newOriginal = updates.originalQuantity ?? listing.originalQuantity;
      if (updates.availableQuantity <= 0) {
        updates.status = 'fully_claimed';
      } else if (updates.availableQuantity < newOriginal) {
        updates.status = 'partially_claimed';
      } else {
        updates.status = 'available';
      }
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id, 
      updates, 
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update listing', error: error.message });
  }
};

// @desc    Update listing quantity (for partial claims)
// @route   PATCH /api/listings/:id/quantity
// @access  Private
const updateListingQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { 
        availableQuantity: quantity,
        status: quantity <= 0 ? 'fully_claimed' : 
                quantity < listing.originalQuantity ? 'partially_claimed' : 'available'
      },
      { new: true }
    );

    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update quantity', error: error.message });
  }
};

// @desc    Delete a listing with cascade handling
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

    // Check if there are active transactions
    const activeTransactions = await Transaction.find({
      listingId: listing._id,
      status: { $in: ['CLAIMED', 'AWAITING_RIDER', 'ASSIGNED', 'IN_TRANSIT'] }
    });

    if (activeTransactions.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete listing with active transactions. Please cancel or complete all transactions first.',
        activeTransactions: activeTransactions.length
      });
    }

    // Cancel pending transactions
    await Transaction.updateMany(
      { 
        listingId: listing._id,
        status: 'PENDING_PAYMENT'
      },
      { 
        status: 'CANCELLED',
        'timeline.cancelledAt': new Date()
      }
    );

    // Delete the listing
    await listing.deleteOne();

    res.status(200).json({ 
      id: req.params.id, 
      message: 'Listing deleted successfully',
      cancelledTransactions: (await Transaction.countDocuments({ 
        listingId: listing._id, 
        status: 'CANCELLED' 
      }))
    });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete listing', error: error.message });
  }
};

// @desc    Get listing statistics
// @route   GET /api/listings/stats
// @access  Private
const getListingStats = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const stats = await Listing.aggregate([
      { $match: { vendor: new mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$originalQuantity' },
          availableQuantity: { $sum: '$availableQuantity' }
        }
      }
    ]);

    const totalListings = await Listing.countDocuments({ vendor: vendorId });
    const totalValue = await Listing.aggregate([
      { $match: { vendor: new mongoose.Types.ObjectId(vendorId), isFree: false } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$originalQuantity'] } } } }
    ]);

    res.status(200).json({
      byStatus: stats,
      totalListings,
      totalValue: totalValue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getListings,
  getListingById,
  getVendorListings,
  getMyListings,
  createListing,
  updateListing,
  updateListingQuantity,
  deleteListing,
  getListingStats,
};
