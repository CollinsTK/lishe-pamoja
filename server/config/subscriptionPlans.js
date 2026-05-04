/**
 * Subscription Plans Configuration
 * Define plans, pricing, and features for the platform
 */

const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    duration: null, // Free forever
    capabilities: {
      canBrowse: true,
      canSell: false,
      canDeliver: false,
    },
    features: {
      // Vendor features
      maxListings: 0,
      canFeature: false,
      analytics: false,
      prioritySupport: false,
      
      // Logistics features
      maxDeliveries: 0,
      canAssign: false,
      deliveryAnalytics: false,
      
      // Recipient features
      canClaim: true,
      notifications: 'basic',
    },
    limits: {
      listings: 0,
      deliveries: 0,
    },
  },

  vendor: {
    name: 'Vendor',
    price: 499, // KES 499/month
    duration: 30, // days
    capabilities: {
      canBrowse: true,
      canSell: true,
      canDeliver: false,
    },
    features: {
      maxListings: 20,
      canFeature: true,
      analytics: 'basic',
      prioritySupport: false,
      maxDeliveries: 0,
      canAssign: false,
      deliveryAnalytics: false,
      canClaim: true,
      notifications: 'standard',
    },
    limits: {
      listings: 20,
      deliveries: 0,
    },
  },

  logistics: {
    name: 'Logistics',
    price: 499, // KES 499/month
    duration: 30, // days
    capabilities: {
      canBrowse: true,
      canSell: false,
      canDeliver: true,
    },
    features: {
      maxListings: 0,
      canFeature: false,
      analytics: false,
      prioritySupport: false,
      maxDeliveries: 50,
      canAssign: true,
      deliveryAnalytics: 'basic',
      canClaim: true,
      notifications: 'standard',
    },
    limits: {
      listings: 0,
      deliveries: 50,
    },
  },

  business: {
    name: 'Business',
    price: 999, // KES 999/month
    duration: 30, // days
    capabilities: {
      canBrowse: true,
      canSell: true,
      canDeliver: true,
    },
    features: {
      maxListings: 100,
      canFeature: true,
      analytics: 'advanced',
      prioritySupport: true,
      maxDeliveries: 200,
      canAssign: true,
      deliveryAnalytics: 'advanced',
      canClaim: true,
      notifications: 'all',
    },
    limits: {
      listings: 100,
      deliveries: 200,
    },
  },

  enterprise: {
    name: 'Enterprise',
    price: 2499, // KES 2,499/month
    duration: 30, // days
    capabilities: {
      canBrowse: true,
      canSell: true,
      canDeliver: true,
    },
    features: {
      maxListings: -1, // Unlimited
      canFeature: true,
      analytics: 'full',
      prioritySupport: true,
      maxDeliveries: -1, // Unlimited
      canAssign: true,
      deliveryAnalytics: 'full',
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
  free: ['vendor', 'logistics', 'business', 'enterprise'],
  vendor: ['business', 'enterprise'],
  logistics: ['business', 'enterprise'],
  business: ['enterprise'],
  enterprise: [],
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