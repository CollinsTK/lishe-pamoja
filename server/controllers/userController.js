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
    // 1. Grabbing all the fields including role, location, and phone
    const { name, email, password, role, location, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Saving them all to MongoDB
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,       
      location,   
      phone       
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        walletBalance: user.walletBalance,
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
        phone: user.phone,
        location: user.location,
        walletBalance: user.walletBalance,
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
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
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

/**
 * Get all available subscription plans
 */
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      features: plan.features,
      limits: plan.limits,
    }));

    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * Subscribe to a plan (initial subscription)
 */
const subscribeToPlan = async (req, res) => {
  try {
    const { planId, phoneNumber } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!planId || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'planId and phoneNumber are required' });
    }

    // Validate plan
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    // Free plan - no payment needed
    if (plan.price === 0) {
      const user = await User.findById(userId);
      user.subscription = {
        plan: planId,
        status: 'active',
        startDate: new Date(),
        endDate: null,
        autoRenew: false,
      };
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Subscribed to Free plan successfully',
        subscription: user.subscription,
      });
    }

    // Validate phone number
    if (!mpesaService.isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const user = await User.findById(userId);
    const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
    const callBackUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/users/subscription/callback`;

    // Initiate STK Push
    const result = await mpesaService.initiateSTKPush({
      phone: formattedPhone,
      amount: plan.price,
      accountReference: `LPSUB${userId}`,
      transactionDesc: `Lishe Pamoja - ${plan.name} Subscription`,
      callBackUrl,
    });

    // Update user with pending subscription
    user.subscription = {
      plan: planId,
      status: 'pending',
      startDate: null,
      endDate: null,
      autoRenew: false,
      mpesaCheckoutRequestId: result.checkoutRequestId,
      mpesaReceiptNumber: null,
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payment initiated. Please enter your PIN on your phone.',
      data: {
        checkoutRequestId: result.checkoutRequestId,
        amount: plan.price,
        plan: plan.name,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Subscription Error', error: error.message });
  }
};

/**
 * Upgrade to a higher plan
 */
  const upgradePlan = async (req, res) => {
  try {
    const { targetPlan, phoneNumber, price } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!targetPlan || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'targetPlan and phoneNumber are required' });
    }

    const user = await User.findById(userId);
    const currentPlan = user.subscription?.plan || 'free';

    // Check if upgrade is valid (bypass for dynamic plans starting with sp_)
    if (!targetPlan.startsWith('sp_') && !canUpgrade(currentPlan, targetPlan)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot upgrade from ${currentPlan} to ${targetPlan}` 
      });
    }

    let targetPlanDetails = SUBSCRIPTION_PLANS[targetPlan];
    
    // Create mock details for dynamic plans
    if (!targetPlanDetails && targetPlan.startsWith('sp_')) {
      targetPlanDetails = {
        name: 'Custom Plan',
        price: price || 0,
        duration: 30
      };
    }

    if (!targetPlanDetails) {
      return res.status(400).json({ success: false, message: 'Invalid target plan' });
    }

    // Calculate amount (prorated if current plan is active)
    let amount = targetPlanDetails.price;
    if (user.subscription?.endDate) {
      const daysRemaining = Math.ceil(
        (new Date(user.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (daysRemaining > 0) {
        const prorated = calculateProratedAmount(currentPlan, targetPlan, daysRemaining);
        if (prorated !== null) {
          amount = prorated;
        }
      }
    }

    // Free upgrade
    if (amount === 0) {
      user.subscription = {
        plan: targetPlan,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + targetPlanDetails.duration * 24 * 60 * 60 * 1000),
        autoRenew: false,
      };
      await user.save();

      return res.status(200).json({
        success: true,
        message: `Upgraded to ${targetPlanDetails.name} plan successfully`,
        subscription: user.subscription,
      });
    }

    // Validate phone and initiate payment
    if (!mpesaService.isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
    const callBackUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/users/subscription/callback`;

    const result = await mpesaService.initiateSTKPush({
      phone: formattedPhone,
      amount,
      accountReference: `LPUPG${userId}`,
      transactionDesc: `Lishe Pamoja - Upgrade to ${targetPlanDetails.name}`,
      callBackUrl,
    });

    user.subscription.plan = targetPlan;
    user.subscription.status = 'pending';
    user.subscription.mpesaCheckoutRequestId = result.checkoutRequestId;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Upgrade payment initiated. Please enter your PIN on your phone.',
      data: {
        checkoutRequestId: result.checkoutRequestId,
        amount,
        plan: targetPlanDetails.name,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upgrade Error', error: error.message });
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
      // Payment successful
      const planDetails = SUBSCRIPTION_PLANS[user.subscription.plan];
      
      user.subscription.status = 'active';
      user.subscription.startDate = new Date();
      user.subscription.endDate = planDetails.duration 
        ? new Date(Date.now() + planDetails.duration * 24 * 60 * 60 * 1000)
        : null;
      user.subscription.mpesaReceiptNumber = MpesaReceiptNumber;
      user.subscription.mpesaCheckoutRequestId = null;

      // Add to payment history
      user.paymentHistory.push({
        amount: Amount,
        plan: user.subscription.plan,
        mpesaReceiptNumber: MpesaReceiptNumber,
        paidAt: new Date(),
        status: 'completed',
      });

      await user.save();
      console.log(`Subscription activated for user ${user.email}: ${user.subscription.plan}`);
    } else {
      // Payment failed
      user.subscription.status = 'active'; // Keep previous plan
      user.subscription.mpesaCheckoutRequestId = null;
      await user.save();
      console.error('Subscription payment failed:', ResultDesc);
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  } catch (error) {
    console.error('Subscription Callback Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  }
};

module.exports = {
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
  getAllUsers,
};