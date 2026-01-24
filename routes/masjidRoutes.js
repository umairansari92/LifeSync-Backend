import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { generalLimiter } from "../middleware/rateLimiter.js";
import {
  getNearbyMasajid,
  getMasjidDetails,
  updateMasjidTiming,
  createMasjid,
  rateMasjid,
  getLeaderboard,
} from "../controllers/masjidController.js";

const router = express.Router();

// Get nearby masajid (public, rate limited)
router.get("/nearby", generalLimiter, getNearbyMasajid);

// Get masjid details
router.get("/:id", generalLimiter, getMasjidDetails);

// Create new masjid (protected)
router.post("/", protect, generalLimiter, createMasjid);

// Update timing (protected)
router.put("/:id/timing", protect, generalLimiter, updateMasjidTiming);

// Rate masjid (protected)
router.post("/:id/rate", protect, generalLimiter, rateMasjid);

// Get leaderboard
router.get("/community/leaderboard", generalLimiter, getLeaderboard);

export default router;
