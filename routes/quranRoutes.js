// src/routes/quranRoutes.js

import express from "express";
import { saveReading, getTodayReading, getReadingHistory, getReadingStats } from "../controllers/quranController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Save today reading (POST /api/quran)
router.post("/", protect, saveReading);

// Get today's reading (GET /api/quran/today)
router.get("/today", protect, getTodayReading);

// Get history (Uses query: ?days=7&type=surah) (GET /api/quran/history)
router.get("/history", protect, getReadingHistory);

// Get reading stats (Uses query: ?period=monthly&type=surah) (GET /api/quran/stats)
router.get("/stats", protect, getReadingStats);

export default router;