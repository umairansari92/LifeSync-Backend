import express from "express";
import {
  markNamaz,
  getNamazHistory,
  getTodayNamaz,
} from "../controllers/namazController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Mark a prayer
router.put("/:date/mark", protect, markNamaz);

// Mark multiple prayers
router.put("/:date/mark-multiple", protect, markMultiplePrayers);

// Get today's prayers
router.get("/today", protect, getTodayNamaz);

// Get history (7 or 30 days)
router.get("/history", protect, getNamazHistory);

export default router;