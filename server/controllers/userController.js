const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const MpesaService = require('../services/mpesaService');
const { SUBSCRIPTION_PLANS, canUpgrade, getPlan, calculateProratedAmount } = require('../config/subscriptionPlans');

// Initialize M-Pesa service
const mpesaService = new MpesaService({
  environment: process.env.MPESA_ENV || 'sandbox',
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  initiatorName: process.env.MPESA_INITIATOR_NAME,
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
});

// Helper function to generate the VIP wristband (Token)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', 
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
const registerUser = async (req, res) => {
  try {
    // 1. Grabbing all the fields - role is no longer required, defaults to 'user'
    const { name, email, password, location, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Create user with default capabilities (free tier: canBrowse only)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user',       // Default role
      capabilities: {
        canBrowse: true,
        canSell: false,
        canDeliver: false,
      },
      isAdmin: false,
      location,
      phone,
      subscription: {
        plan: 'free',
        status: 'active',
      },
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        capabilities: user.capabilities,
        isAdmin: user.isAdmin,
        phone: user.phone,
        location: user.location,
        walletBalance: user.walletBalance,
        subscription: user.subscription,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Authenticate a user (Login)
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        capabilities: user.capabilities || { canBrowse: true, canSell: false, canDeliver: false },
        isAdmin: user.isAdmin || false,
        phone: user.phone,
        location: user.location,
        walletBalance: user.walletBalance,
        subscription: user.subscription,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/users/me
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (user) {
      // Ensure capabilities are always returned
      const response = {
        ...user.toObject(),
        capabilities: user.capabilities || { canBrowse: true, canSell: false, canDeliver: false },
        isAdmin: user.isAdmin || false,
      };
      res.json(response);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update profile (name, phone, location)
// @route   PUT /api/users/me
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, phone, location } = req.body;
    if (name !== undefined)  user.name  = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) {
      user.location = {
        lat:     location.lat     ?? user.location?.lat     ?? null,
        lng:     location.lng     ?? user.location?.lng     ?? null,
        address: location.address ?? user.location?.address ?? null,
      };
    }

    await user.save();
    const u = user.toObject();
    delete u.password;
    res.json({ success: true, user: u });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/users
const getAllUsers = async (req, res) => {
  try {
    // In a real app, we should check if req.user.role === 'admin'
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============== Subscription Functions ==============
const SubscriptionPlan = require('../models/SubscriptionPlan');

/**
 * Get all available subscription plans
 * Now fetches from database instead of static config
 */
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });

    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * Subscribe to a plan — activates immediately, no payment gateway
 */
const subscribeToPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!planId) return res.status(400).json({ success: false, message: 'planId is required' });

    const plan = await SubscriptionPlan.findOne({ planId, isActive: true });
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    user.subscription = {
      plan: planId,
      status: 'active',
      startDate,
      endDate,
      autoRenew: false,
      paymentMethod: null,
    };

    user.capabilities = {
      canBrowse: true,
      canSell: plan.capabilities.canSell || false,
      canDeliver: plan.capabilities.canDeliver || false,
    };

    user.paymentHistory.push({
      amount: plan.price,
      plan: planId,
      paidAt: startDate,
      status: 'completed',
    });

    user.subscriptionHistory.push({
      plan: planId,
      status: 'active',
      startDate,
      endDate,
      amount: plan.price,
    });

    await user.save();

    console.log(`[SUBSCRIPTION] ${user.email} activated ${plan.name} - KES ${plan.price}`);
    return res.status(200).json({ success: true, message: `Subscribed to ${plan.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Subscription Error', error: error.message });
  }
};

/**
 * Change plan (upgrade or downgrade) with prorated calculations.
 *
 * UPGRADE (new plan costs more):
 *   - Remaining value of current plan is credited
 *   - New plan starts now, ends 30 days from now
 *   - No charge (remaining value covers or exceeds new plan cost in simulation)
 *
 * DOWNGRADE (new plan costs less):
 *   - Remaining value converted to extra days on the cheaper plan
 *   - newEndDate = today + floor(remainingValue / dailyRateNew) days
 */
const changePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!planId) return res.status(400).json({ success: false, message: 'planId is required' });

    const [user, newPlan] = await Promise.all([
      User.findById(userId),
      SubscriptionPlan.findOne({ planId, isActive: true }),
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!newPlan) return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });

    const currentPlanId = user.subscription?.plan;
    if (currentPlanId === planId) {
      return res.status(400).json({ success: false, message: 'Already on this plan' });
    }

    const now = new Date();
    const currentEndDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : null;
    const daysRemaining = currentEndDate && currentEndDate > now
      ? Math.max(0, Math.ceil((currentEndDate - now) / (1000 * 60 * 60 * 24)))
      : 0;

    // Fetch current plan details for value calculation
    const currentPlan = currentPlanId
      ? await SubscriptionPlan.findOne({ planId: currentPlanId })
      : null;

    const currentDailyRate = currentPlan ? currentPlan.price / (currentPlan.durationDays || 30) : 0;
    const remainingValue = Math.round(daysRemaining * currentDailyRate);

    const newDailyRate = newPlan.price / (newPlan.durationDays || 30);
    const isUpgrade = newPlan.price > (currentPlan?.price || 0);

    let newEndDate;
    let changeType;
    let summary;

    if (!currentPlan || daysRemaining === 0) {
      // No active plan — fresh start
      newEndDate = new Date(now.getTime() + newPlan.durationDays * 24 * 60 * 60 * 1000);
      changeType = 'new';
      summary = `Started ${newPlan.name} for ${newPlan.durationDays} days`;
    } else if (isUpgrade) {
      // Upgrade: credit buys fewer days at the higher daily rate
      const daysFromCredit = Math.floor(remainingValue / newDailyRate);
      newEndDate = new Date(now.getTime() + daysFromCredit * 24 * 60 * 60 * 1000);
      changeType = 'upgrade';
      summary = `Upgraded to ${newPlan.name}. Your KES ${remainingValue} remaining credit gives you ${daysFromCredit} days on the new plan`;
    } else {
      // Downgrade: remaining value stretches further on the cheaper plan
      const extraDays = Math.floor(remainingValue / newDailyRate);
      const totalDays = newPlan.durationDays + extraDays;
      newEndDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);
      changeType = 'downgrade';
      summary = `Downgraded to ${newPlan.name}. Your KES ${remainingValue} remaining value gives you ${extraDays} extra days on top of the ${newPlan.durationDays}-day plan (${totalDays} days total)`;
    }

    user.subscription = {
      plan: planId,
      status: 'active',
      startDate: now,
      endDate: newEndDate,
      autoRenew: false,
      paymentMethod: null,
    };

    user.capabilities = {
      canBrowse: true,
      canSell: newPlan.capabilities.canSell || false,
      canDeliver: newPlan.capabilities.canDeliver || false,
    };

    user.subscriptionHistory.push({
      plan: planId,
      status: 'active',
      startDate: now,
      endDate: newEndDate,
      amount: newPlan.price,
    });

    await user.save();

    console.log(`[PLAN CHANGE] ${user.email}: ${currentPlanId || 'free'} → ${planId} (${changeType}) | ends ${newEndDate.toDateString()}`);

    return res.status(200).json({
      success: true,
      changeType,
      summary,
      daysRemaining: Math.ceil((newEndDate - now) / (1000 * 60 * 60 * 24)),
      endDate: newEndDate,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Plan change error', error: error.message });
  }
};

/**
 * Check subscription status
 */
const checkSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId).select('-password');
    
    const currentPlan = user.subscription?.plan || 'free';
    const planDetails = SUBSCRIPTION_PLANS[currentPlan];

    // Check if expired
    if (user.subscription?.endDate && new Date() > user.subscription.endDate) {
      user.subscription.status = 'expired';
      await user.save();
    }

    res.status(200).json({
      success: true,
      subscription: {
        plan: user.subscription?.plan || 'free',
        status: user.subscription?.status || 'active',
        startDate: user.subscription?.startDate,
        endDate: user.subscription?.endDate,
        autoRenew: user.subscription?.autoRenew || false,
      },
      planDetails: {
        name: planDetails.name,
        features: planDetails.features,
        limits: planDetails.limits,
      },
      paymentHistory: user.paymentHistory || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * Cancel subscription (at end of billing period)
 */
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId);

    if (user.subscription?.plan === 'free') {
      return res.status(400).json({ success: false, message: 'Free plan cannot be cancelled' });
    }

    user.subscription.autoRenew = false;
    user.subscription.status = 'cancelled';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
      subscription: user.subscription,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * Setup payout account (for vendors/logistics to receive payments)
 */
const setupPayoutAccount = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'phoneNumber is required' });
    }

    const user = await User.findById(userId);

    // Only vendors and logistics can have payout accounts
    if (!['vendor', 'logistics'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Only vendors and logistics can setup payout accounts' });
    }

    if (!mpesaService.isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);

    user.payoutSettings = {
      mpesaPhone: formattedPhone,
      isVerified: false,
      verifiedAt: null,
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payout account setup initiated. You will receive a verification SMS.',
      payoutSettings: user.payoutSettings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payout Setup Error', error: error.message });
  }
};

/**
 * Verify payout account (would typically involve a test transaction)
 */
const verifyPayoutAccount = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId);

    if (!user.payoutSettings?.mpesaPhone) {
      return res.status(400).json({ success: false, message: 'No payout account setup' });
    }

    // In production, this would verify via a small test transaction
    // For now, mark as verified after setup
    user.payoutSettings.isVerified = true;
    user.payoutSettings.verifiedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payout account verified successfully',
      payoutSettings: user.payoutSettings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Verification Error', error: error.message });
  }
};

/**
 * Handle subscription payment callback from M-Pesa
 */
const handleSubscriptionCallback = async (req, res) => {
  try {
    const body = req.body;
    console.log('M-Pesa Subscription Callback:', JSON.stringify(body));

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      Amount,
      MpesaReceiptNumber,
      PhoneNumber,
    } = body;

    // Find user by checkout request ID
    const user = await User.findOne({
      'subscription.mpesaCheckoutRequestId': CheckoutRequestID,
    });

    if (!user) {
      console.error('User not found for subscription callback:', MerchantRequestID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
    }

    if (ResultCode === 0) {
      // Payment successful — fetch plan from DB
      const plan = await SubscriptionPlan.findOne({ planId: user.subscription.plan });
      const durationDays = plan?.durationDays || 30;

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      user.subscription.status = 'active';
      user.subscription.startDate = startDate;
      user.subscription.endDate = endDate;
      user.subscription.mpesaReceiptNumber = MpesaReceiptNumber;
      user.subscription.mpesaCheckoutRequestId = null;

      // Update capabilities based on DB plan
      user.capabilities = {
        canBrowse: true,
        canSell: plan?.capabilities?.canSell || false,
        canDeliver: plan?.capabilities?.canDeliver || false,
      };

      // Add to payment history
      user.paymentHistory.push({
        amount: Amount,
        plan: user.subscription.plan,
        mpesaReceiptNumber: MpesaReceiptNumber,
        paidAt: new Date(),
        status: 'completed',
        paymentMethod: 'mpesa',
      });

      // Add to subscription history
      user.subscriptionHistory.push({
        plan: user.subscription.plan,
        status: 'active',
        startDate,
        endDate,
        paymentMethod: 'mpesa',
        amount: Amount,
      });

      await user.save();
      console.log(`[MPESA CALLBACK] Subscription activated for ${user.email}: ${user.subscription.plan}`);
    } else {
      // Payment failed — reset to cancelled
      user.subscription.status = 'cancelled';
      user.subscription.mpesaCheckoutRequestId = null;
      await user.save();
      console.error(`[MPESA CALLBACK] Payment failed for ${user.email}: ${ResultDesc}`);
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  } catch (error) {
    console.error('Subscription Callback Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  }
};

/**
 * Poll M-Pesa payment status for subscription
 * Frontend calls this after STK push to check if payment completed
 */
const checkMpesaPaymentStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const user = await User.findById(userId).select('-password');
    const status = user.subscription?.status;

    if (status === 'active') {
      return res.status(200).json({
        success: true,
        status: 'active',
        subscription: user.subscription,
        capabilities: user.capabilities,
      });
    }

    if (status === 'cancelled') {
      return res.status(200).json({
        success: false,
        status: 'cancelled',
        message: 'Payment was cancelled or failed.',
      });
    }

    // Still pending
    return res.status(200).json({ success: true, status: 'pending' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc  Admin: update any user's capabilities / suspend / activate
// @route PUT /api/users/admin/:id
const adminUpdateUser = async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: 'Admin only' });
    const { capabilities, isAdmin: makeAdmin, suspended, phone, name } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (capabilities !== undefined) user.capabilities = { ...user.capabilities, ...capabilities };
    if (makeAdmin !== undefined) user.isAdmin = makeAdmin;
    if (suspended !== undefined) {
      user.subscription.status = suspended ? 'suspended' : 'active';
    }
    if (phone !== undefined) user.phone = phone;
    if (name !== undefined) user.name = name;

    await user.save();
    const updated = user.toObject();
    delete updated.password;
    res.json({ success: true, user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc  Admin: delete a user
// @route DELETE /api/users/admin/:id
const adminDeleteUser = async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ message: 'Admin only' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Initiate wallet top-up via M-Pesa STK Push
 * POST /api/users/wallet/topup
 */
async function walletTopup(req, res) {
  try {
    const { amount, phoneNumber } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!amount || amount < 1) return res.status(400).json({ success: false, message: 'Amount must be at least KES 1' });
    if (!phoneNumber) return res.status(400).json({ success: false, message: 'Phone number is required' });
    if (!mpesaService.isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number. Use 07XXXXXXXX or 2547XXXXXXXX' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
    const callBackUrl = `${process.env.BASE_URL}/api/users/wallet/topup/callback`;

    const result = await mpesaService.initiateSTKPush({
      phone: formattedPhone,
      amount: Math.round(amount),
      accountReference: `LPWALLET${userId.toString().slice(-6)}`,
      transactionDesc: 'Lishe Pamoja Wallet Top-Up',
      callBackUrl,
    });

    // Store pending top-up on user record so callback can match it
    user.pendingTopup = {
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
      amount: Math.round(amount),
      phone: formattedPhone,
      initiatedAt: new Date(),
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'STK Push sent. Enter your M-Pesa PIN to complete.',
      checkoutRequestId: result.checkoutRequestId,
    });
  } catch (error) {
    console.error('Wallet Topup Error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Top-up initiation failed' });
  }
}

/**
 * M-Pesa STK Push callback for wallet top-up
 * POST /api/users/wallet/topup/callback  (public — called by Safaricom)
 */
async function walletTopupCallback(req, res) {
  try {
    const body = req.body;
    console.log('Wallet Topup Callback:', JSON.stringify(body, null, 2));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    let amount = null;
    let receiptNumber = null;
    if (ResultCode === 0 && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'Amount') amount = item.Value;
        if (item.Name === 'MpesaReceiptNumber') receiptNumber = item.Value;
      }
    }

    const user = await User.findOne({ 'pendingTopup.checkoutRequestId': CheckoutRequestID });
    if (!user) {
      console.error('Wallet topup: no user found for CheckoutRequestID', CheckoutRequestID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
    }

    if (ResultCode === 0) {
      const credited = amount || user.pendingTopup.amount;
      user.walletBalance = (user.walletBalance || 0) + credited;
      console.log(`✅ Wallet topup: +KES ${credited} for user ${user.email}. New balance: ${user.walletBalance}`);
    } else {
      console.error(`❌ Wallet topup failed for ${user.email}. Code: ${ResultCode}, Desc: ${ResultDesc}`);
    }

    user.pendingTopup = undefined;
    await user.save();

    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  } catch (error) {
    console.error('Wallet Topup Callback Error:', error.message);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  }
}

/**
 * Poll wallet top-up status (frontend polls this after STK Push)
 * GET /api/users/wallet/topup/status/:checkoutRequestId
 */
async function walletTopupStatus(req, res) {
  try {
    const { checkoutRequestId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    // Check if the callback already cleared pendingTopup (means it completed)
    const user = await User.findById(userId).select('walletBalance pendingTopup');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const stillPending = user.pendingTopup?.checkoutRequestId === checkoutRequestId;

    if (!stillPending) {
      // Callback already fired — payment succeeded (or was cleared)
      return res.status(200).json({ success: true, status: 'completed', walletBalance: user.walletBalance });
    }

    // Still pending — ask Daraja directly
    try {
      const result = await mpesaService.checkSTKStatus(checkoutRequestId);
      if (result.resultCode === 0) {
        return res.status(200).json({ success: true, status: 'completed', walletBalance: user.walletBalance });
      } else if (result.resultCode === 1032) {
        return res.status(200).json({ success: true, status: 'cancelled' });
      } else {
        return res.status(200).json({ success: true, status: 'pending' });
      }
    } catch {
      return res.status(200).json({ success: true, status: 'pending' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
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
};