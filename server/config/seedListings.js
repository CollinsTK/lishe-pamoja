require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Listing = require('../models/Listing');

// ── 5 vendor users spread across Nairobi ─────────────────────────────────────
const VENDOR_PLAN_ID = 'plan_vendor01';

const VENDORS = [
  {
    name: 'Mama Wanjiku Foods',
    email: 'wanjiku.foods@lishe.ke',
    phone: '0712000001',
    location: { lat: -1.2921, lng: 36.8219, address: 'Nairobi CBD, Nairobi' },
  },
  {
    name: 'Westlands Bakery',
    email: 'westlands.bakery@lishe.ke',
    phone: '0712000002',
    location: { lat: -1.2667, lng: 36.8118, address: 'Westlands, Nairobi' },
  },
  {
    name: 'Karen Fresh Produce',
    email: 'karen.fresh@lishe.ke',
    phone: '0712000003',
    location: { lat: -1.3192, lng: 36.7076, address: 'Karen, Nairobi' },
  },
  {
    name: 'Eastleigh Grocery Hub',
    email: 'eastleigh.hub@lishe.ke',
    phone: '0712000004',
    location: { lat: -1.2749, lng: 36.8528, address: 'Eastleigh, Nairobi' },
  },
  {
    name: 'Kilimani Kitchen',
    email: 'kilimani.kitchen@lishe.ke',
    phone: '0712000005',
    location: { lat: -1.2893, lng: 36.7864, address: 'Kilimani, Nairobi' },
  },
];

// ── 20 listings across Nairobi neighbourhoods ─────────────────────────────────
// Nairobi area coords spread: CBD, Westlands, Karen, Eastleigh, Kilimani,
// Parklands, South B, Ngong Rd, Upperhill, Kasarani
const now = new Date();
const hours = (h) => new Date(now.getTime() + h * 60 * 60 * 1000);

const LISTING_TEMPLATES = [
  // ── CBD ──────────────────────────────────────────────────────────────────
  {
    title: 'Ugali & Sukuma Wiki — Lunch Surplus',
    description: 'Freshly cooked ugali and sukuma wiki from our lunch service. Packaged in takeaway containers.',
    category: 'Prepared Meals',
    unit: 'plates',
    originalQuantity: 30,
    foodCondition: 'Cooked',
    price: 80,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2864, lng: 36.8230, address: 'River Road, Nairobi CBD' },
    dietaryTags: ['Vegan'],
  },
  {
    title: 'Chapati — End of Day Batch',
    description: 'Soft layered chapatis made this morning. Over 40 pieces unsold.',
    category: 'Bakery',
    unit: 'pieces',
    originalQuantity: 40,
    foodCondition: 'Cooked',
    price: 20,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2830, lng: 36.8254, address: 'Tom Mboya Street, Nairobi CBD' },
    dietaryTags: [],
  },
  // ── Westlands ─────────────────────────────────────────────────────────────
  {
    title: 'Sourdough Loaves — Day-Old',
    description: 'Artisan sourdough loaves from our morning bake. Still fresh, perfect for toast.',
    category: 'Bakery',
    unit: 'loaves',
    originalQuantity: 15,
    foodCondition: 'Packaged',
    price: 150,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2637, lng: 36.8058, address: 'Waiyaki Way, Westlands' },
    dietaryTags: [],
  },
  {
    title: 'Mixed Salad Box Surplus',
    description: 'Pre-packaged salad boxes from catering order. Rocket, tomato, cucumber, feta.',
    category: 'Fresh Produce',
    unit: 'boxes',
    originalQuantity: 20,
    foodCondition: 'Raw Produce',
    price: 200,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2670, lng: 36.8101, address: 'Parklands Road, Westlands' },
    dietaryTags: ['Vegetarian', 'Gluten-Free'],
  },
  {
    title: 'Samosas — Catering Leftover',
    description: 'Beef and vegetable samosas from a corporate event. Approximately 80 pieces.',
    category: 'Snacks',
    unit: 'pieces',
    originalQuantity: 80,
    foodCondition: 'Cooked',
    price: 30,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2650, lng: 36.8130, address: 'Mpaka Road, Westlands' },
    dietaryTags: [],
  },
  // ── Karen ──────────────────────────────────────────────────────────────────
  {
    title: 'Organic Kale & Spinach Bundle',
    description: 'Fresh kale and spinach harvested this morning from our small farm. Pesticide-free.',
    category: 'Fresh Produce',
    unit: 'kgs',
    originalQuantity: 25,
    foodCondition: 'Raw Produce',
    price: 0,
    isFree: true,
    deliveryAllowed: false,
    location: { lat: -1.3178, lng: 36.7101, address: 'Karen Hardy, Karen' },
    dietaryTags: ['Vegan', 'Organic'],
  },
  {
    title: 'Avocados — Farm Surplus',
    description: 'Large ripe Hass avocados direct from the farm. Must go today.',
    category: 'Fresh Produce',
    unit: 'pieces',
    originalQuantity: 60,
    foodCondition: 'Raw Produce',
    price: 30,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.3210, lng: 36.7055, address: 'Langata Road, Karen' },
    dietaryTags: ['Vegan'],
  },
  {
    title: 'Roast Chicken Pieces',
    description: 'Whole roasted chicken pieces from lunch prep. 5 half-chickens available.',
    category: 'Prepared Meals',
    unit: 'pieces',
    originalQuantity: 10,
    foodCondition: 'Cooked',
    price: 350,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.3150, lng: 36.7090, address: 'Karen Shopping Centre' },
    dietaryTags: [],
  },
  // ── Eastleigh ─────────────────────────────────────────────────────────────
  {
    title: 'Pilau Rice — Bulk Remainder',
    description: 'Spiced pilau rice cooked for an event, excess stock available. Beef included.',
    category: 'Prepared Meals',
    unit: 'kgs',
    originalQuantity: 15,
    foodCondition: 'Cooked',
    price: 200,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2745, lng: 36.8498, address: '1st Avenue, Eastleigh' },
    dietaryTags: ['Halal'],
  },
  {
    title: 'Mandazi — Morning Batch Unsold',
    description: 'Freshly fried mandazi from the morning. 50 pieces unsold.',
    category: 'Bakery',
    unit: 'pieces',
    originalQuantity: 50,
    foodCondition: 'Cooked',
    price: 10,
    isFree: false,
    deliveryAllowed: false,
    location: { lat: -1.2760, lng: 36.8520, address: '2nd Avenue, Eastleigh' },
    dietaryTags: ['Halal'],
  },
  {
    title: 'Mango Juice Cartons — Near Expiry',
    description: 'Sealed 500ml mango juice cartons, best before tomorrow. 24 cartons.',
    category: 'Beverages',
    unit: 'cartons',
    originalQuantity: 24,
    foodCondition: 'Packaged',
    price: 50,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2730, lng: 36.8510, address: '3rd Avenue, Eastleigh' },
    dietaryTags: ['Vegan'],
  },
  // ── Kilimani ──────────────────────────────────────────────────────────────
  {
    title: 'Pasta & Tomato Sauce — Catering Extra',
    description: 'Italian-style pasta with homemade tomato sauce. 12 portions remaining.',
    category: 'Prepared Meals',
    unit: 'portions',
    originalQuantity: 12,
    foodCondition: 'Cooked',
    price: 250,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2890, lng: 36.7852, address: 'Argwings Kodhek Road, Kilimani' },
    dietaryTags: ['Vegetarian'],
  },
  {
    title: 'Yoghurt Pots — Short Date',
    description: 'Sealed 500g natural yoghurt pots, best before in 2 days. 18 pots.',
    category: 'Dairy',
    unit: 'pots',
    originalQuantity: 18,
    foodCondition: 'Packaged',
    price: 120,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2901, lng: 36.7875, address: 'Dennis Pritt Road, Kilimani' },
    dietaryTags: ['Vegetarian'],
  },
  // ── Parklands ─────────────────────────────────────────────────────────────
  {
    title: 'Dhokla & Chutney — Desi Snacks',
    description: 'Steamed dhokla with mint and tamarind chutney. Freshly made, 20 portions.',
    category: 'Snacks',
    unit: 'portions',
    originalQuantity: 20,
    foodCondition: 'Cooked',
    price: 100,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2605, lng: 36.8195, address: 'Limuru Road, Parklands' },
    dietaryTags: ['Vegetarian', 'Vegan'],
  },
  {
    title: 'Brown Bread Loaves',
    description: 'Freshly baked brown bread from our morning batch. 12 loaves unsold.',
    category: 'Bakery',
    unit: 'loaves',
    originalQuantity: 12,
    foodCondition: 'Packaged',
    price: 0,
    isFree: true,
    deliveryAllowed: false,
    location: { lat: -1.2588, lng: 36.8212, address: 'Ndemi Road, Parklands' },
    dietaryTags: [],
  },
  // ── South B ───────────────────────────────────────────────────────────────
  {
    title: 'Githeri — Home-Cooked Surplus',
    description: 'Mixed maize and beans cooked in a rich tomato base. 20 portions.',
    category: 'Prepared Meals',
    unit: 'portions',
    originalQuantity: 20,
    foodCondition: 'Cooked',
    price: 0,
    isFree: true,
    deliveryAllowed: false,
    location: { lat: -1.3115, lng: 36.8337, address: 'Mombasa Road, South B' },
    dietaryTags: ['Vegan', 'Gluten-Free'],
  },
  // ── Upperhill ─────────────────────────────────────────────────────────────
  {
    title: 'Coffee & Tea Station Leftovers',
    description: 'Sealed packs of ground coffee and tea bags from a corporate event. 30 packs.',
    category: 'Beverages',
    unit: 'packs',
    originalQuantity: 30,
    foodCondition: 'Packaged',
    price: 80,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2999, lng: 36.8154, address: 'Hospital Road, Upperhill' },
    dietaryTags: [],
  },
  // ── Ngong Road ────────────────────────────────────────────────────────────
  {
    title: 'Maize Flour — Bulk Surplus',
    description: 'Sealed 2kg packs of Jogoo maize flour, short shelf date. 10 packs.',
    category: 'Grains',
    unit: 'packs',
    originalQuantity: 10,
    foodCondition: 'Packaged',
    price: 150,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.3054, lng: 36.7760, address: 'Ngong Road, Nairobi' },
    dietaryTags: ['Vegan'],
  },
  // ── Kasarani ──────────────────────────────────────────────────────────────
  {
    title: 'Tomatoes & Onions — Market Surplus',
    description: 'Fresh tomatoes and red onions from today\'s market surplus. 30kg total.',
    category: 'Fresh Produce',
    unit: 'kgs',
    originalQuantity: 30,
    foodCondition: 'Raw Produce',
    price: 60,
    isFree: false,
    deliveryAllowed: true,
    location: { lat: -1.2218, lng: 36.8956, address: 'Kasarani Market, Kasarani' },
    dietaryTags: ['Vegan'],
  },
  {
    title: 'Mutura — Grilled Kenyan Sausage',
    description: 'Traditional mutura grilled on-site. 25 portions available this evening.',
    category: 'Prepared Meals',
    unit: 'portions',
    originalQuantity: 25,
    foodCondition: 'Cooked',
    price: 60,
    isFree: false,
    deliveryAllowed: false,
    location: { lat: -1.2200, lng: 36.8972, address: 'Thika Road, Kasarani' },
    dietaryTags: [],
  },
];

// ── Assign listings round-robin to vendors ────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const passwordHash = await bcrypt.hash('Lishe@2025', 10);
    const vendorDocs = [];

    for (const v of VENDORS) {
      let user = await User.findOne({ email: v.email });
      if (!user) {
        user = new User({
          name: v.name,
          email: v.email,
          password: passwordHash,
          phone: v.phone,
          location: v.location,
          capabilities: { canBrowse: true, canSell: true, canDeliver: false },
          subscription: {
            plan: VENDOR_PLAN_ID,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenew: false,
          },
          paymentHistory: [{
            amount: 500,
            plan: VENDOR_PLAN_ID,
            paidAt: new Date(),
            status: 'completed',
          }],
        });
        await user.save();
        console.log(`  👤 Created vendor: ${v.name}`);
      } else {
        // Ensure existing user has vendor capability + active subscription
        user.capabilities.canSell = true;
        user.subscription = {
          plan: VENDOR_PLAN_ID,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: false,
        };
        await user.save();
        console.log(`  👤 Updated vendor: ${v.name}`);
      }
      vendorDocs.push(user);
    }

    // Delete existing seeded listings (identified by these vendor emails)
    const vendorIds = vendorDocs.map(v => v._id);
    const deleted = await Listing.deleteMany({ vendor: { $in: vendorIds } });
    if (deleted.deletedCount > 0) {
      console.log(`  🗑  Removed ${deleted.deletedCount} old seeded listings`);
    }

    // Create 20 listings
    for (let i = 0; i < LISTING_TEMPLATES.length; i++) {
      const t = LISTING_TEMPLATES[i];
      const vendor = vendorDocs[i % vendorDocs.length];

      // Expiry: between 3 and 10 hours from now
      const expiryHours = 3 + (i % 8);
      const expiry = hours(expiryHours);
      const pickupStart = hours(0.5);
      const pickupEnd   = new Date(expiry.getTime() - 30 * 60 * 1000);

      const listing = new Listing({
        vendor: vendor._id,
        title: t.title,
        description: t.description,
        originalQuantity: t.originalQuantity,
        availableQuantity: t.originalQuantity,
        unit: t.unit,
        foodCondition: t.foodCondition,
        expiryDateTime: expiry,
        pickupWindowStart: pickupStart,
        pickupWindowEnd: pickupEnd,
        price: t.price,
        isFree: t.isFree,
        category: t.category,
        images: [],
        deliveryAllowed: t.deliveryAllowed,
        location: t.location,
        dietaryTags: t.dietaryTags || [],
        status: 'available',
      });

      await listing.save();
      console.log(`  📦 [${i + 1}/20] ${t.title} → ${vendor.name}`);
    }

    console.log('\n🎉 Listings seeded successfully (20 listings, 5 vendor accounts)');
    console.log('   All vendors use password: Lishe@2025');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
