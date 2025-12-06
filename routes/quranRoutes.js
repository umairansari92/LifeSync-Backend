import express from "express";
import { saveReading, getTodayReading, getReadingHistory, getReadingStats } from "../controllers/quranController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Save today reading
router.post("/", protect, saveReading);

// Get today's reading
router.get("/today", protect, getTodayReading);

// Get history (daily/monthly/yearly/lifetime)
router.get("/history", protect, getReadingHistory);

// Get reading stats
router.get("/stats", protect, getReadingStats);

export default router;
