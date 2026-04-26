/**
 * Subscription Plans Configuration
 * Define plans, pricing, and features for the platform
 */

const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    duration: null, // Free forever
    features: {
      // Vendor features
      maxListings: 5,
      canFeature: false,
      analytics: false,
      prioritySupport: false,
      
      // Logistics features
      maxDeliveries: 10,
      canAssign: false,
      deliveryAnalytics: false,
      
      // Recipient features
      canClaim: true,
      notifications: 'basic',
    },
    limits: {
      listings: 5,
      deliveries: 10,
    },
  },

  sp1: {
    name: 'Starter',
    price: 499, // KES 499/month
    duration: 30, // days
    features: {
      // Vendor features
      maxListings: 20,
      canFeature: true,
      analytics: 'basic',
      prioritySupport: false,
      
      // Logistics features
      maxDeliveries: 50,
      canAssign: true,
      deliveryAnalytics: 'basic',
      
      // Recipient features
      canClaim: true,
      notifications: 'standard',
    },
    limits: {
      listings: 20,
      deliveries: 50,
    },
  },

  sp2: {
    name: 'Growth',
    price: 999, // KES 999/month
    duration: 30, // days
    features: {
      // Vendor features
      maxListings: 100,
      canFeature: true,
      analytics: 'advanced',
      prioritySupport: true,
      
      // Logistics features
      maxDeliveries: 200,
      canAssign: true,
      deliveryAnalytics: 'advanced',
      
      // Recipient features
      canClaim: true,
      notifications: 'all',
    },
    limits: {
      listings: 100,
      deliveries: 200,
    },
  },

  sp3: {
    name: 'Enterprise',
    price: 2499, // KES 2,499/month
    duration: 30, // days
    features: {
      // Vendor features
      maxListings: -1, // Unlimited
      canFeature: true,
      analytics: 'full',
      prioritySupport: true,
      
      // Logistics features
      maxDeliveries: -1, // Unlimited
      canAssign: true,
      deliveryAnalytics: 'full',
      
      // Recipient features
      canClaim: true,
      notifications: 'all',
    },
    limits: {
      listings: -1,
      deliveries: -1,
    },
  },
};

// Plan upgrade paths
const PLAN_UPGRADE_PATHS = {
  free: ['sp1', 'sp2', 'sp3'],
  sp1: ['sp2', 'sp3'],
  sp2: ['sp3'],
  sp3: [],
};

// Check if upgrade is valid
const canUpgrade = (currentPlan, targetPlan) => {
  return PLAN_UPGRADE_PATHS[currentPlan]?.includes(targetPlan);
};

// Get plan details
const getPlan = (planName) => {
  return SUBSCRIPTION_PLANS[planName];
};

// Calculate prorated amount (for mid-cycle upgrades)
const calculateProratedAmount = (currentPlan, targetPlan, daysRemaining) => {
  const current = SUBSCRIPTION_PLANS[currentPlan];
  const target = SUBSCRIPTION_PLANS[targetPlan];
  
  if (!current || !target) return null;
  
  const dailyRate = target.price / 30;
  return Math.round(dailyRate * daysRemaining);
};

module.exports = {
  SUBSCRIPTION_PLANS,
  PLAN_UPGRADE_PATHS,
  canUpgrade,
  getPlan,
  calculateProratedAmount,
};