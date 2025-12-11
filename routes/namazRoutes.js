import express from "express";
import {
  markNamaz,
  getNamazHistory,
  getTodayNamaz,
  autoSaveMissedPrayers,
  markMultiplePrayers,
} from "../controllers/namazController.js";
import { protect } from "../middleware/authMiddleware.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Mark a prayer
router.put("/:date/mark", protect, generalLimiter, markNamaz);

// Mark multiple prayers
router.put("/:date/mark-multiple", protect, generalLimiter, markMultiplePrayers);

// Get today's prayers
router.get("/today", protect, generalLimiter, getTodayNamaz);

// Get history (7 or 30 days)
router.get("/history", protect, generalLimiter, getNamazHistory);

// routes/namaz.js
router.get("/auto-save-missed", protect, generalLimiter, autoSaveMissedPrayers);

export default router;