import express from "express";
import {
  markNamaz,
  getNamazHistory,
  getTodayNamaz,
  markMultiplePrayers,
} from "../controllers/namazController.js";
import { protect } from "../middleware/authMiddleware.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Get today's prayers (Timings + Hijri + Offered Status)
// Frontend call: /api/namaz/today?lat=24.8&lng=67.0&hijriOffset=0
router.get("/today", protect, generalLimiter, getTodayNamaz);

// Mark a single prayer
router.put("/:date/mark", protect, generalLimiter, markNamaz);

// Mark multiple prayers
router.put(
  "/:date/mark-multiple",
  protect,
  generalLimiter,
  markMultiplePrayers
);

// Get history (Last 7 or 30 days)
router.get("/history", protect, generalLimiter, getNamazHistory);

export default router;
