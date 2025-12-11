import express from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming auth middleware exists
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply 'protect' middleware to ensure only logged-in users can access
router.get('/', protect, generalLimiter, getDashboardData);

export default router;