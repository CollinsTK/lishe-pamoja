const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const User = require('../models/User');
const OrderGroup = require('../models/OrderGroup');
const { generateReceiptUrl } = require('../utils/receiptGenerator');
const MpesaService = require('../services/mpesaService');
const { haversineKm, deliveryFeeBreakdown, vendorEarningsBreakdown } = require('../utils/deliveryPricing');

// Initialize M-Pesa service with config from environment
const mpesaService = new MpesaService({
  environment: process.env.MPESA_ENV || 'sandbox',
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  initiatorName: process.env.MPESA_INITIATOR_NAME,
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
});

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

    if (listing.vendor.toString() === recipientId.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot claim your own listing' });
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

const checkoutCart = async (req, res) => {
  try {
    const { items, phoneNumber } = req.body;
    // items: [{ listingId, quantity, fulfillmentMode, deliveryFee }]
    const recipientId = req.user?.id;
    if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

    let totalAmount = 0;
    const transactions = [];

    // Validate all items before modifying anything
    const resolvedListings = [];
    for (const item of items) {
      const listing = await Listing.findOne({
        _id: item.listingId,
        status: { $in: ['available', 'partially_claimed'] },
        availableQuantity: { $gte: item.quantity },
      });
      if (!listing) return res.status(400).json({ success: false, message: `Listing unavailable or insufficient quantity` });
      if (listing.vendor.toString() === recipientId.toString()) {
        return res.status(403).json({ success: false, message: `You cannot claim your own listing: ${listing.title}` });
      }
      resolvedListings.push({ listing, item });
    }

    // Reserve all listings
    for (const { listing, item } of resolvedListings) {
      const pickupPin = generatePIN();
      const deliveryPin = generatePIN();

      const remainingQuantity = listing.availableQuantity - item.quantity;
      listing.availableQuantity = remainingQuantity;
      listing.status = remainingQuantity === 0 ? 'fully_claimed' : 'partially_claimed';
      await listing.save();

      // Compute distance-based delivery fee if delivery + coords provided
      let computedDeliveryFee = item.deliveryFee || 0;
      let riderGross = 0, riderNet = 0, deliveryPlatformFee = 0;

      if (
        item.fulfillmentMode === 'Delivery' &&
        item.deliveryLocation?.lat && item.deliveryLocation?.lng &&
        listing.location?.lat && listing.location?.lng
      ) {
        const distKm = haversineKm(
          listing.location.lat, listing.location.lng,
          item.deliveryLocation.lat, item.deliveryLocation.lng
        );
        const breakdown = deliveryFeeBreakdown(distKm);
        computedDeliveryFee  = breakdown.gross;
        riderGross           = breakdown.gross;
        riderNet             = breakdown.riderNet;
        deliveryPlatformFee  = breakdown.platform;
      }

      const vBreak = vendorEarningsBreakdown(listing.price || 0, item.quantity);
      const totalPlatformFee = vBreak.platform + deliveryPlatformFee;

      const transaction = new Transaction({
        listingId: listing._id,
        vendorId: listing.vendor,
        recipientId,
        quantity: item.quantity,
        fulfillmentMode: item.fulfillmentMode || 'Pickup',
        deliveryFee: computedDeliveryFee,
        deliveryLocation: item.deliveryLocation
          ? { lat: item.deliveryLocation.lat, lng: item.deliveryLocation.lng, address: item.deliveryLocation.address }
          : undefined,
        status: phoneNumber ? 'PENDING_PAYMENT' : 'CLAIMED',
        securityCodes: { pickupPin, deliveryPin },
        earnings: {
          vendorGross: vBreak.gross,
          vendorNet:   vBreak.vendorNet,
          riderGross,
          riderNet,
          platformFee: totalPlatformFee,
          settled: false,
        },
      });
      
      const itemPrice = (listing.price || 0) * item.quantity + computedDeliveryFee;
      totalAmount += itemPrice;

      transactions.push(transaction);
    }

    const orderGroup = new OrderGroup({
      recipientId,
      totalAmount,
    });

    for (const t of transactions) {
      t.orderGroupId = orderGroup._id;
      await t.save();
    }

    orderGroup.transactions = transactions.map(t => t._id);
    await orderGroup.save();

    if (phoneNumber && totalAmount > 0) {
      // M-Pesa STK Push
      const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
      const callBackUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/transactions/payment/callback`;

      try {
        const result = await mpesaService.initiateSTKPush({
          phone: formattedPhone,
          amount: totalAmount,
          accountReference: `LP${orderGroup._id}`,
          transactionDesc: `Lishe Pamoja - Order Group ${orderGroup._id}`,
          callBackUrl,
        });

        orderGroup.payment = {
          method: 'mpesa',
          checkoutRequestId: result.checkoutRequestId,
          merchantRequestId: result.merchantRequestId,
          phoneNumber: formattedPhone,
          status: 'pending',
        };
        await orderGroup.save();

        return res.status(201).json({
          success: true,
          message: 'Checkout successful. Please enter your PIN.',
          orderGroup,
          checkoutRequestId: result.checkoutRequestId,
        });
      } catch (mpesaErr) {
        console.error('STK Push failed during checkout:', mpesaErr.message);
        return res.status(400).json({
          success: false,
          message: `M-Pesa payment failed: ${mpesaErr.message}. Check your MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in .env`,
        });
      }
    }

    // Wallet payment — deduct server-side (covers listing price + delivery fee)
    if (totalAmount > 0) {
      const recipient = await User.findById(recipientId);
      if (!recipient) return res.status(404).json({ success: false, message: 'User not found' });
      if ((recipient.walletBalance || 0) < totalAmount) {
        return res.status(400).json({ success: false, message: `Insufficient wallet balance. Need KES ${totalAmount}, have KES ${recipient.walletBalance || 0}` });
      }
      recipient.walletBalance = (recipient.walletBalance || 0) - totalAmount;
      await recipient.save();

      // Mark every transaction's payment as completed
      for (const t of transactions) {
        t.payment = { status: 'completed', method: 'wallet', paidAt: new Date() };
        await t.save();
      }
      orderGroup.payment = { method: 'wallet', status: 'completed' };
      await orderGroup.save();
    }

    res.status(201).json({
      success: true,
      message: 'Checkout successful.',
      orderGroup,
      walletBalance: totalAmount > 0 ? (await User.findById(recipientId).select('walletBalance')).walletBalance : undefined,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const acceptDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const logisticsId = req.user?.id;

    if (!logisticsId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'AWAITING_RIDER') {
      return res.status(400).json({ success: false, message: 'This dispatch is no longer available' });
    }

    transaction.logisticsId = logisticsId;
    transaction.status = 'ASSIGNED';
    transaction.timeline.logisticsAcceptedAt = Date.now();
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Dispatch accepted. Head to the vendor and enter the vendor PIN to confirm pickup.',
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
    const userId = req.user?.id;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'ASSIGNED') {
      return res.status(400).json({ success: false, message: 'Transaction is not ready for pickup verification' });
    }
    if (transaction.vendorId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only the vendor can confirm pickup' });
    }
    if (transaction.securityCodes.pickupPin !== pin) {
      return res.status(400).json({ success: false, message: 'Invalid rider PIN' });
    }

    transaction.status = 'IN_TRANSIT';
    transaction.timeline.pickedUpAt = Date.now();
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Pickup confirmed. Head to the recipient.',
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
    const userId = req.user?.id;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'IN_TRANSIT') {
      return res.status(400).json({ success: false, message: 'Transaction is not in transit' });
    }
    if (transaction.logisticsId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only the assigned rider can verify delivery' });
    }
    if (transaction.securityCodes.deliveryPin !== pin) {
      return res.status(400).json({ success: false, message: 'Invalid recipient PIN' });
    }

    transaction.status = 'DELIVERED';
    transaction.timeline.deliveredAt = Date.now();
    try { transaction.documents.receiptUrl = await generateReceiptUrl(transaction); } catch (_) {}

    // Settle earnings — credit rider and vendor wallets, record platform fee
    try {
      if (!transaction.earnings?.settled) {
        const riderNet  = transaction.earnings?.riderNet  || 0;
        const vendorNet = transaction.earnings?.vendorNet || 0;

        if (riderNet > 0 && transaction.logisticsId) {
          await User.findByIdAndUpdate(transaction.logisticsId, { $inc: { walletBalance: riderNet } });
        }
        if (vendorNet > 0 && transaction.vendorId) {
          await User.findByIdAndUpdate(transaction.vendorId, { $inc: { walletBalance: vendorNet } });
        }

        transaction.earnings.settled   = true;
        transaction.earnings.settledAt = new Date();
      }
    } catch (settlementErr) {
      console.error('Earnings settlement error:', settlementErr.message);
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Delivery confirmed. Order complete!',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const transaction = await Transaction.findById(id).populate('listingId');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    const isVendor = transaction.vendorId.toString() === userId;
    const isRecipient = transaction.recipientId.toString() === userId;
    if (!isVendor && !isRecipient) {
      return res.status(403).json({ message: 'Not authorized to cancel this transaction' });
    }

    // Cannot cancel once rider is en-route or delivered
    if (!['CLAIMED', 'AWAITING_RIDER'].includes(transaction.status)) {
      return res.status(400).json({ message: 'Cannot cancel an order that is already in transit or delivered' });
    }

    if (transaction.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    const now = Date.now();

    const listing = transaction.listingId;
    const refundAmount = (listing.price || 0) * transaction.quantity + (transaction.deliveryFee || 0);

    const user = await User.findById(userId);
    if (refundAmount > 0 && transaction.payment.status === 'completed') {
      user.walletBalance = (user.walletBalance || 0) + refundAmount;
      await user.save();
    }

    listing.availableQuantity += transaction.quantity;
    if (listing.status === 'fully_claimed') {
      listing.status = 'partially_claimed';
    }
    await listing.save();

    transaction.status = 'CANCELLED';
    transaction.timeline.cancelledAt = now;
    if (transaction.payment.status === 'completed') {
      transaction.payment.status = 'refunded';
    }
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Transaction cancelled. ${refundAmount > 0 && transaction.payment.status === 'completed' ? `Ksh ${refundAmount} refunded to your Wallet.` : ''}`,
      transaction,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Vendor marks a delivery order as ready for a rider to claim
const markReadyForDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.vendorId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only the vendor can mark this order for dispatch' });
    }
    if (transaction.status !== 'CLAIMED') {
      return res.status(400).json({ success: false, message: 'Only CLAIMED orders can be marked ready for dispatch' });
    }

    transaction.status = 'AWAITING_RIDER';
    transaction.readyForDispatch = true;
    await transaction.save();

    res.status(200).json({ success: true, message: 'Order is now awaiting a rider', transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Logistics: get all delivery transactions awaiting a rider
const getAvailableDispatches = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      status: 'AWAITING_RIDER',
      logisticsId: null,
    })
      .populate('listingId', 'title category unit price isFree location')
      .populate('vendorId', 'name phone')
      .populate('recipientId', 'name phone')
      .sort('-createdAt');

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Rider fetches their own active dispatches (IN_TRANSIT assigned to them)
const getRiderDispatches = async (req, res) => {
  try {
    const logisticsId = req.user?.id;
    if (!logisticsId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const transactions = await Transaction.find({
      logisticsId,
      status: { $in: ['ASSIGNED', 'IN_TRANSIT', 'DELIVERED'] },
    })
      .populate('listingId', 'title category unit price isFree location')
      .populate('vendorId', 'name phone')
      .populate('recipientId', 'name phone')
      .sort('-createdAt');

    // Never expose deliveryPin to the rider — recipient holds it
    const safe = transactions.map((tx) => {
      const obj = tx.toObject();
      if (obj.securityCodes) obj.securityCodes = { pickupPin: obj.securityCodes.pickupPin };
      return obj;
    });

    res.status(200).json({ success: true, transactions: safe });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// My Orders — only transactions where the logged-in user is the recipient
const getTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const transactions = await Transaction.find({ recipientId: userId })
      .populate('listingId')
      .populate('vendorId', 'name email phone')
      .populate('recipientId', 'name email phone')
      .populate('logisticsId', 'name email phone')
      .sort('-createdAt');

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Sales Orders — only transactions where the logged-in user is the vendor (and not also the recipient)
const getVendorTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const transactions = await Transaction.find({ vendorId: userId, recipientId: { $ne: userId } })
      .populate('listingId')
      .populate('vendorId', 'name email phone')
      .populate('recipientId', 'name email phone')
      .populate('logisticsId', 'name email phone')
      .sort('-createdAt');

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .populate('listingId')
      .populate('vendorId', 'name email phone')
      .populate('recipientId', 'name email phone')
      .populate('logisticsId', 'name email phone')
      .sort('-createdAt');

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// GET /price-delivery?fromLat=&fromLng=&toLat=&toLng=
const priceDelivery = (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;
    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ success: false, message: 'fromLat, fromLng, toLat, toLng are required' });
    }
    const breakdown = deliveryFeeBreakdown(
      haversineKm(parseFloat(fromLat), parseFloat(fromLng), parseFloat(toLat), parseFloat(toLng))
    );
    res.status(200).json({ success: true, ...breakdown });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// GET /admin/earnings — aggregate platform earnings from all transactions
const getAdminEarnings = async (req, res) => {
  try {
    const all = await Transaction.find({ status: { $in: ['DELIVERED', 'IN_TRANSIT', 'ASSIGNED'] } })
      .populate('vendorId', 'name email')
      .populate('logisticsId', 'name email')
      .populate('listingId', 'title price')
      .sort('-createdAt');

    // Platform totals
    let totalPlatformFee   = 0;
    let totalVendorGross   = 0;
    let totalVendorNet     = 0;
    let totalRiderGross    = 0;
    let totalRiderNet      = 0;

    // Per-vendor map
    const vendorMap  = {};
    // Per-rider map
    const riderMap   = {};

    for (const tx of all) {
      const e = tx.earnings || {};
      totalPlatformFee += e.platformFee || 0;
      totalVendorGross += e.vendorGross  || 0;
      totalVendorNet   += e.vendorNet    || 0;
      totalRiderGross  += e.riderGross   || 0;
      totalRiderNet    += e.riderNet     || 0;

      // Vendor breakdown
      if (tx.vendorId) {
        const vid = tx.vendorId._id.toString();
        if (!vendorMap[vid]) vendorMap[vid] = { id: vid, name: tx.vendorId.name, email: tx.vendorId.email, gross: 0, net: 0, platformFee: 0, orders: 0 };
        vendorMap[vid].gross      += e.vendorGross || 0;
        vendorMap[vid].net        += e.vendorNet   || 0;
        vendorMap[vid].platformFee += (e.platformFee || 0) - (e.riderGross ? Math.round(e.riderGross * 0.1) : 0);
        vendorMap[vid].orders++;
      }

      // Rider breakdown
      if (tx.logisticsId) {
        const rid = tx.logisticsId._id.toString();
        if (!riderMap[rid]) riderMap[rid] = { id: rid, name: tx.logisticsId.name, email: tx.logisticsId.email, gross: 0, net: 0, platformFee: 0, deliveries: 0 };
        riderMap[rid].gross       += e.riderGross  || 0;
        riderMap[rid].net         += e.riderNet    || 0;
        riderMap[rid].platformFee += e.riderGross ? Math.round(e.riderGross * 0.1) : 0;
        riderMap[rid].deliveries++;
      }
    }

    // Subscription earnings — read from User.paymentHistory (status === 'completed')
    let subscriptionEarnings = 0;
    const subscriptionByPlan = {}; // { [planId]: { plan, count, total } }
    try {
      const User = require('../models/User');
      // Only load users who have at least one paymentHistory entry
      const usersWithPayments = await User.find({ 'paymentHistory.0': { $exists: true } })
        .select('name email paymentHistory');
      for (const u of usersWithPayments) {
        for (const p of (u.paymentHistory || [])) {
          if (p.status === 'completed') {
            subscriptionEarnings += p.amount || 0;
            const planKey = p.plan || 'unknown';
            if (!subscriptionByPlan[planKey]) {
              subscriptionByPlan[planKey] = { plan: planKey, count: 0, total: 0 };
            }
            subscriptionByPlan[planKey].count++;
            subscriptionByPlan[planKey].total += p.amount || 0;
          }
        }
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      summary: {
        totalPlatformFee,
        totalVendorGross,
        totalVendorNet,
        totalRiderGross,
        totalRiderNet,
        subscriptionEarnings,
        totalRevenue: totalPlatformFee + subscriptionEarnings,
      },
      subscriptionBreakdown: Object.values(subscriptionByPlan).sort((a, b) => b.total - a.total),
      vendors: Object.values(vendorMap).sort((a, b) => b.gross - a.gross),
      riders:  Object.values(riderMap).sort((a, b) => b.gross - a.gross),
      transactionCount: all.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// GET /rider/earnings — delivery earnings summary for the logged-in rider
const getRiderEarnings = async (req, res) => {
  try {
    const logisticsId = req.user?.id;
    if (!logisticsId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const delivered = await Transaction.find({
      logisticsId,
      status: 'DELIVERED',
    })
      .populate('listingId', 'title category')
      .populate('recipientId', 'name')
      .sort('-createdAt');

    let totalGross = 0;
    let totalNet   = 0;
    let totalPlatformFee = 0;

    const history = delivered.map((tx) => {
      const e = tx.earnings || {};
      const gross       = e.riderGross      || tx.deliveryFee || 0;
      const net         = e.riderNet        || gross;
      const platformFee = e.settled ? gross - net : Math.round(gross * 0.1);

      totalGross       += gross;
      totalNet         += net;
      totalPlatformFee += platformFee;

      return {
        id:           tx._id,
        listing:      tx.listingId?.title || 'Delivery',
        category:     tx.listingId?.category || '',
        recipient:    tx.recipientId?.name || 'Customer',
        gross,
        net,
        platformFee,
        deliveredAt:  tx.timeline?.deliveredAt || tx.updatedAt || tx.createdAt,
        settled:      e.settled || false,
      };
    });

    // Also get in-progress deliveries (pending earnings)
    const inProgress = await Transaction.find({
      logisticsId,
      status: { $in: ['ASSIGNED', 'IN_TRANSIT'] },
    }).select('deliveryFee earnings status createdAt listingId')
      .populate('listingId', 'title');

    const pendingEarnings = inProgress.reduce((s, tx) => {
      const e = tx.earnings || {};
      return s + (e.riderNet || (tx.deliveryFee ? tx.deliveryFee * 0.9 : 0));
    }, 0);

    const rider = await User.findById(logisticsId).select('walletBalance name');

    res.status(200).json({
      success: true,
      summary: {
        totalDeliveries:  delivered.length,
        totalGross:       Math.round(totalGross),
        totalNet:         Math.round(totalNet),
        totalPlatformFee: Math.round(totalPlatformFee),
        pendingEarnings:  Math.round(pendingEarnings),
        activeDeliveries: inProgress.length,
        walletBalance:    rider?.walletBalance || 0,
      },
      history,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * Poll order group payment status — called by frontend after STK Push
 * GET /api/transactions/order-group/:id/payment-status
 */
const checkOrderPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientId = req.user?.id;
    const record = await OrderGroup.findOne({ _id: id, recipientId });
    if (!record) return res.status(404).json({ success: false, message: 'Order not found' });

    const status = record.payment?.status || 'pending';

    return res.status(200).json({
      success: true,
      paymentStatus: status,
      orderGroup: record,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  claimListing,
  checkoutCart,
  checkOrderPaymentStatus,
  acceptDispatch,
  verifyPickup,
  verifyDelivery,
  cancelTransaction,
  markReadyForDispatch,
  getAvailableDispatches,
  getRiderDispatches,
  getRiderEarnings,
  initiatePayment,
  checkPaymentStatus,
  processPayout,
  handlePaymentCallback,
  handlePayoutCallback,
  getTransactions,
  getVendorTransactions,
  getAllTransactions,
  priceDelivery,
  getAdminEarnings,
};

// ============== Payment Functions ==============

/**
 * Initiate M-Pesa STK Push payment
 */
async function initiatePayment(req, res) {
  try {
    const { transactionId, phoneNumber, amount } = req.body;
    const recipientId = req.user?.id;

    if (!recipientId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!transactionId || !phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: 'transactionId, phoneNumber, and amount are required' });
    }

    // Validate phone number
    if (!mpesaService.isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const transaction = await Transaction.findOne({
      _id: transactionId,
      recipientId,
      payment: { status: { $in: ['pending', 'failed'] } },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found or already paid' });
    }

    const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
    const callBackUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/transactions/payment/callback`;

    const result = await mpesaService.initiateSTKPush({
      phone: formattedPhone,
      amount: amount || transaction.deliveryFee,
      accountReference: `LP${transaction._id}`,
      transactionDesc: `Lishe Pamoja - Transaction ${transaction._id}`,
      callBackUrl,
    });

    // Update transaction with payment details
    transaction.payment = {
      method: 'mpesa',
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
      phoneNumber: formattedPhone,
      amount: amount || transaction.deliveryFee,
      status: 'pending',
    };
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payment initiated. Please enter your PIN on your phone.',
      data: {
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
        amount: amount || transaction.deliveryFee,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment Error', error: error.message });
  }
}

/**
 * Check payment status
 */
async function checkPaymentStatus(req, res) {
  try {
    const { checkoutRequestId } = req.params;

    if (!checkoutRequestId) {
      return res.status(400).json({ success: false, message: 'checkoutRequestId is required' });
    }

    const result = await mpesaService.checkSTKStatus(checkoutRequestId);

    // If payment is complete, update transaction
    if (result.resultCode === 0) {
      const transaction = await Transaction.findOne({
        'payment.checkoutRequestId': checkoutRequestId,
      });

      if (transaction) {
        transaction.payment.status = 'completed';
        transaction.payment.paidAt = new Date();
        await transaction.save();
      }
    }

    res.status(200).json({
      success: true,
      resultCode: result.resultCode,
      resultDesc: result.resultDesc,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Status Check Error', error: error.message });
  }
}

/**
 * Process payout to vendor/logistics (B2C)
 */
async function processPayout(req, res) {
  try {
    const { transactionId, recipientType = 'vendor' } = req.body;
    const initiatorId = req.user?.id;

    // Only admins or logistics can trigger payouts
    if (!initiatorId || !['admin', 'logistics'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to process payouts' });
    }

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId is required' });
    }

    const transaction = await Transaction.findById(transactionId)
      .populate('vendorId')
      .populate('logisticsId');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.payment?.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Transaction payment not completed' });
    }

    if (transaction.payout?.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Payout already processed' });
    }

    const callBackUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/transactions/payout/callback`;

    // Calculate payout amounts (you can adjust the percentage)
    const vendorAmount = transaction.listingId?.price ? transaction.listingId.price * transaction.quantity * 0.85 : 0; // 85% to vendor
    const logisticsAmount = transaction.deliveryFee || 0;

    const results = {};

    // Pay vendor if amount > 0 and they have verified payout settings
    if (vendorAmount > 0 && transaction.vendorId?.payoutSettings?.isVerified && transaction.vendorId.payoutSettings.mpesaPhone) {
      const vendorPhone = mpesaService.formatPhoneNumber(transaction.vendorId.payoutSettings.mpesaPhone);
      results.vendor = await mpesaService.sendB2CPayment({
        phone: vendorPhone,
        amount: vendorAmount,
        commandId: 'BusinessPayment',
        occasion: 'Vendor Payout',
        callBackUrl,
      });
    } else if (vendorAmount > 0 && transaction.vendorId?.phone) {
      // Fallback to primary phone if payout not set up
      console.log(`Vendor ${transaction.vendorId._id} has no verified payout account. Holding vendor payment.`);
      results.vendor = { status: 'pending', message: 'Vendor payout account not verified' };
    }

    // Pay logistics if amount > 0 and they have verified payout settings
    if (logisticsAmount > 0 && transaction.logisticsId?.payoutSettings?.isVerified && transaction.logisticsId.payoutSettings.mpesaPhone) {
      const logisticsPhone = mpesaService.formatPhoneNumber(transaction.logisticsId.payoutSettings.mpesaPhone);
      results.logistics = await mpesaService.sendB2CPayment({
        phone: logisticsPhone,
        amount: logisticsAmount,
        commandId: 'BusinessPayment',
        occasion: 'Logistics Payout',
        callBackUrl,
      });
    } else if (logisticsAmount > 0 && transaction.logisticsId?.phone) {
      // Fallback to primary phone if payout not set up
      console.log(`Logistics ${transaction.logisticsId._id} has no verified payout account. Holding logistics payment.`);
      results.logistics = { status: 'pending', message: 'Logistics payout account not verified' };
    }

    // Update transaction with payout details
    transaction.payout = {
      vendorAmount,
      logisticsAmount,
      status: results.vendor?.conversationId || results.logistics?.conversationId ? 'processing' : 'pending',
      b2cConversationId: results.vendor?.conversationId || results.logistics?.conversationId,
    };
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payout initiated successfully.',
      data: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payout Error', error: error.message });
  }
}

/**
 * Handle M-Pesa payment callback (STK Push)
 * Safaricom Daraja sends: { Body: { stkCallback: { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } } }
 */
async function handlePaymentCallback(req, res) {
  try {
    const body = req.body;
    console.log('M-Pesa Payment Callback:', JSON.stringify(body, null, 2));

    // Unwrap the nested stkCallback envelope
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      console.error('Invalid callback structure — missing Body.stkCallback');
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Extract metadata items (Amount, MpesaReceiptNumber, PhoneNumber)
    let MpesaReceiptNumber = null;
    let Amount = null;
    let PhoneNumber = null;
    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'MpesaReceiptNumber') MpesaReceiptNumber = item.Value;
        if (item.Name === 'Amount') Amount = item.Value;
        if (item.Name === 'PhoneNumber') PhoneNumber = item.Value;
      }
    }

    // Try Transaction first, then OrderGroup
    let record = await Transaction.findOne({
      'payment.merchantRequestId': MerchantRequestID,
      'payment.checkoutRequestId': CheckoutRequestID,
    });

    let isOrderGroup = false;
    if (!record) {
      record = await OrderGroup.findOne({
        'payment.checkoutRequestId': CheckoutRequestID,
      });
      isOrderGroup = !!record;
    }

    if (!record) {
      console.error('No Transaction/OrderGroup found for callback. CheckoutRequestID:', CheckoutRequestID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
    }

    if (ResultCode === 0) {
      record.payment.status = 'completed';
      record.payment.mpesaReceiptNumber = MpesaReceiptNumber;
      record.payment.paidAt = new Date();
      if (Amount) record.payment.amount = Amount;
      console.log(`✅ Payment confirmed. Receipt: ${MpesaReceiptNumber}, Amount: ${Amount}`);

      // Advance all PENDING_PAYMENT child transactions to CLAIMED
      if (isOrderGroup && record.transactions?.length) {
        await Transaction.updateMany(
          { _id: { $in: record.transactions }, status: 'PENDING_PAYMENT' },
          { $set: {
            status: 'CLAIMED',
            'payment.status': 'completed',
            'payment.paidAt': new Date(),
            'payment.mpesaReceiptNumber': MpesaReceiptNumber,
          }}
        );
      }
    } else {
      record.payment.status = 'failed';
      console.error(`❌ Payment failed. ResultCode: ${ResultCode}, Desc: ${ResultDesc}`);

      // Revert: cancel transactions and restore listing quantities
      if (isOrderGroup && record.transactions?.length) {
        const failedTxns = await Transaction.find({ _id: { $in: record.transactions } });
        for (const txn of failedTxns) {
          // Restore listing quantity
          await Listing.findByIdAndUpdate(txn.listingId, {
            $inc: { availableQuantity: txn.quantity },
          });
          // Recompute listing status
          const listing = await Listing.findById(txn.listingId);
          if (listing) {
            listing.status = listing.availableQuantity > 0 ? 'available' : 'fully_claimed';
            await listing.save();
          }
          txn.status = 'CANCELLED';
          await txn.save();
        }
        console.log(`🔄 Reverted ${failedTxns.length} transaction(s) and restored listing quantities.`);
      }
    }

    await record.save();

    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  } catch (error) {
    console.error('Callback Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  }
}

/**
 * Handle M-Pesa B2C payout callback
 */
async function handlePayoutCallback(req, res) {
  try {
    const body = req.body;
    console.log('M-Pesa Payout Callback:', JSON.stringify(body));

    const {
      ConversationID,
      OriginatorConversationID,
      ResultCode,
      ResultDesc,
    } = body;

    // Find transaction by conversation ID
    const transaction = await Transaction.findOne({
      'payout.b2cConversationId': { $in: [ConversationID, OriginatorConversationID] },
    });

    if (!transaction) {
      console.error('Transaction not found for payout callback:', ConversationID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
    }

    if (ResultCode === 0) {
      // Payout successful
      transaction.payout.status = 'completed';
      transaction.payout.paidAt = new Date();
    } else {
      // Payout failed
      transaction.payout.status = 'failed';
      console.error('Payout failed:', ResultDesc);
    }

    await transaction.save();

    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  } catch (error) {
    console.error('Payout Callback Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  }
}