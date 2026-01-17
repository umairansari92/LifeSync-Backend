import express from 'express';
import { getDashboardData, getPublicStats } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming auth middleware exists
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public endpoint for landing page - no auth required
router.get('/public', generalLimiter, getPublicStats);

// Protected endpoint for logged-in users
router.get('/', protect, generalLimiter, getDashboardData);

export default router;