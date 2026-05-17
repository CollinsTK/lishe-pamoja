require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const plans = [
  {
    planId: 'plan_vendor01',
    name: 'Vendor Monthly',
    description: 'Sell food and surplus produce on the platform. Perfect for individuals and small businesses.',
    price: 500,
    durationType: 'monthly',
    durationDays: 30,
    capabilities: { canSell: true, canDeliver: false },
    limits: { listings: 20, deliveries: 0 },
    features: [
      'Post up to 20 listings per month',
      'Manage orders and sales',
      'Access vendor dashboard',
      'Sales reports & analytics',
    ],
    isActive: true,
  },
  {
    planId: 'plan_rider001',
    name: 'Rider Monthly',
    description: 'Deliver orders across the platform and earn per delivery. Ideal for dispatch riders.',
    price: 300,
    durationType: 'monthly',
    durationDays: 30,
    capabilities: { canSell: false, canDeliver: true },
    limits: { listings: 0, deliveries: -1 },
    features: [
      'Unlimited delivery assignments',
      'Access to active dispatch map',
      'Delivery history & earnings',
      'Real-time order notifications',
    ],
    isActive: true,
  },
  {
    planId: 'plan_biz0001',
    name: 'Business Monthly',
    description: 'Sell and deliver on the platform. Best for businesses managing both sales and logistics.',
    price: 700,
    durationType: 'monthly',
    durationDays: 30,
    capabilities: { canSell: true, canDeliver: true },
    limits: { listings: -1, deliveries: -1 },
    features: [
      'Unlimited listings',
      'Unlimited delivery assignments',
      'Full vendor & rider dashboard',
      'Advanced reports & analytics',
      'Priority support',
    ],
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    for (const plan of plans) {
      await SubscriptionPlan.findOneAndUpdate(
        { planId: plan.planId },
        plan,
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded: ${plan.name}`);
    }

    console.log('🎉 All plans seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
