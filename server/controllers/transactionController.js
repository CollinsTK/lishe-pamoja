const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const { generateReceiptUrl } = require('../utils/receiptGenerator');

const generatePIN = () => Math.floor(1000 + Math.random() * 9000).toString();

const claimListing = async (req, res) => {
  try {
    const {
      listingId,
      quantity = 1,
      fulfillmentMode = 'Pickup',
      deliveryFee = 0,
    } = req.body;

    const recipientId = req.user?.id;
    if (!recipientId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!listingId) {
      return res.status(400).json({ success: false, message: 'listingId is required' });
    }

    const listing = await Listing.findOne({
      _id: listingId,
      status: { $in: ['available', 'partially_claimed'] },
      availableQuantity: { $gte: quantity },
    });

    if (!listing) {
      return res.status(400).json({ success: false, message: 'Listing unavailable or insufficient quantity' });
    }

    const pickupPin = generatePIN();
    const deliveryPin = generatePIN();

    const remainingQuantity = listing.availableQuantity - quantity;
    listing.availableQuantity = remainingQuantity;
    listing.status = remainingQuantity === 0 ? 'fully_claimed' : 'partially_claimed';
    await listing.save();

    const transaction = await Transaction.create({
      listingId,
      vendorId: listing.vendor,
      recipientId,
      quantity,
      fulfillmentMode,
      deliveryFee,
      status: 'CLAIMED',
      securityCodes: {
        pickupPin,
        deliveryPin,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Listing claimed successfully. Waiting for logistics.',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const acceptDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const logisticsId = req.body.logisticsId || req.user?.id;

    if (!logisticsId) {
      return res.status(401).json({ success: false, message: 'Logistics partner authentication required' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'CLAIMED') {
      return res.status(400).json({ success: false, message: 'Transaction is not available for dispatch acceptance' });
    }

    transaction.logisticsId = logisticsId;
    transaction.status = 'LOGISTICS_ASSIGNED';
    transaction.timeline.logisticsAcceptedAt = Date.now();
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Dispatch accepted successfully.',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const verifyPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'LOGISTICS_ASSIGNED') {
      return res.status(400).json({ success: false, message: 'Transaction is not ready for pickup verification' });
    }
    if (transaction.securityCodes.pickupPin !== pin) {
      return res.status(400).json({ success: false, message: 'Invalid Pickup PIN' });
    }

    transaction.status = 'IN_TRANSIT';
    transaction.timeline.pickedUpAt = Date.now();
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Pickup verified. Food is now in transit.',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const verifyDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'IN_TRANSIT') {
      return res.status(400).json({ success: false, message: 'Transaction is not in transit' });
    }
    if (transaction.securityCodes.deliveryPin !== pin) {
      return res.status(400).json({ success: false, message: 'Invalid Delivery PIN' });
    }

    transaction.status = 'DELIVERED';
    transaction.timeline.deliveredAt = Date.now();
    await transaction.save();

    transaction.status = 'COMPLETED';
    transaction.timeline.completedAt = Date.now();
    transaction.documents.receiptUrl = await generateReceiptUrl(transaction);
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Delivery verified. Transaction complete.',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = {
  claimListing,
  acceptDispatch,
  verifyPickup,
  verifyDelivery,
};