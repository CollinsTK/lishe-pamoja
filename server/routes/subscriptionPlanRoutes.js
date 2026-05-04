const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getActivePlans,
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  hardDeletePlan,
  getSubscriptionStats,
} = require('../controllers/subscriptionPlanController');

// Public route - get active plans for subscription page
router.get('/', getActivePlans);

// Protected route - get single plan details
router.get('/:planId', protect, getPlanById);

// Admin only routes
router.get('/admin/all', protect, requireAdmin, getAllPlans);
router.get('/admin/stats', protect, requireAdmin, getSubscriptionStats);
router.post('/admin', protect, requireAdmin, createPlan);
router.put('/admin/:planId', protect, requireAdmin, updatePlan);
router.delete('/admin/:planId', protect, requireAdmin, deletePlan);
router.delete('/admin/:planId/hard', protect, requireAdmin, hardDeletePlan);

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
}

module.exports = router;
