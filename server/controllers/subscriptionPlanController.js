const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');

/**
 * Get all active subscription plans (public)
 * Returns only active plans for user subscription page
 */
const getActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    
    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message,
    });
  }
};

/**
 * Get all subscription plans (admin only)
 * Returns all plans including inactive ones
 */
const getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Error fetching all subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message,
    });
  }
};

/**
 * Get single plan by ID
 */
const getPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await SubscriptionPlan.findOne({ planId });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }
    
    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plan',
      error: error.message,
    });
  }
};

/**
 * Create new subscription plan (admin only)
 */
const createPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      durationType,
      capabilities,
      features,
      limits,
    } = req.body;
    
    // Validation
    if (!name || price === undefined || !durationType) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and duration type are required',
      });
    }
    
    // Validate duration type
    const validDurations = ['monthly', 'quarterly', 'yearly'];
    if (!validDurations.includes(durationType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid duration type. Must be: monthly, quarterly, or yearly',
      });
    }
    
    // Generate unique plan ID
    let planId = SubscriptionPlan.generatePlanId();
    let exists = await SubscriptionPlan.findOne({ planId });
    
    // Ensure uniqueness
    while (exists) {
      planId = SubscriptionPlan.generatePlanId();
      exists = await SubscriptionPlan.findOne({ planId });
    }
    
    // Calculate duration days
    const daysMap = {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };
    
    const plan = new SubscriptionPlan({
      planId,
      name,
      description: description || '',
      price: Number(price),
      durationType,
      durationDays: daysMap[durationType],
      capabilities: {
        canSell: capabilities?.canSell || false,
        canDeliver: capabilities?.canDeliver || false,
      },
      features: features || [],
      limits: {
        listings: limits?.listings !== undefined ? limits.listings : 0,
        deliveries: limits?.deliveries !== undefined ? limits.deliveries : 0,
      },
      isActive: true,
    });
    
    await plan.save();
    
    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      plan,
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription plan',
      error: error.message,
    });
  }
};

/**
 * Update subscription plan (admin only)
 */
const updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const updates = req.body;
    
    const plan = await SubscriptionPlan.findOne({ planId });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }
    
    // Prevent updating planId
    delete updates.planId;
    delete updates._id;
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key === 'capabilities') {
        plan.capabilities = { ...plan.capabilities, ...updates[key] };
      } else if (key === 'limits') {
        plan.limits = { ...plan.limits, ...updates[key] };
      } else {
        plan[key] = updates[key];
      }
    });
    
    await plan.save();
    
    res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully',
      plan,
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
      error: error.message,
    });
  }
};

/**
 * Delete (soft delete by deactivating) subscription plan (admin only)
 */
const deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await SubscriptionPlan.findOne({ planId });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }
    
    // Soft delete - just deactivate
    plan.isActive = false;
    await plan.save();
    
    res.status(200).json({
      success: true,
      message: 'Subscription plan deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscription plan',
      error: error.message,
    });
  }
};

/**
 * Hard delete subscription plan (admin only, for completely removing test plans)
 */
const hardDeletePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    
    const result = await SubscriptionPlan.deleteOne({ planId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Subscription plan permanently deleted',
    });
  } catch (error) {
    console.error('Error hard deleting subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscription plan',
      error: error.message,
    });
  }
};

/**
 * Get subscription statistics (admin only)
 */
const getSubscriptionStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
        },
      },
    ]);
    
    const totalUsers = await User.countDocuments();
    const activeSubscribers = await User.countDocuments({
      'subscription.status': 'active',
      'subscription.plan': { $ne: 'free' },
    });
    
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeSubscribers,
        planDistribution: stats,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription statistics',
      error: error.message,
    });
  }
};

module.exports = {
  getActivePlans,
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  hardDeletePlan,
  getSubscriptionStats,
};
