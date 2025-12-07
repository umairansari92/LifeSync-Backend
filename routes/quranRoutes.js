// src/routes/quranRoutes.js

import express from "express";
import { 
    saveReading, 
    getTodayReading, 
    getReadingHistory, 
    getReadingStats,
    updateReading, // <-- NEW
    deleteReading // <-- NEW
} from "../controllers/quranController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Save new reading or update existing for today
router.post("/", protect, saveReading);

// 2. Get today's reading
router.get("/today", protect, getTodayReading);

// 3. Get history
router.get("/history", protect, getReadingHistory);

// 4. Get reading stats
router.get("/stats", protect, getReadingStats);

// 5. Update specific reading (Edit function)
router.put("/:id", protect, updateReading);

// 6. Delete specific reading (Delete function)
router.delete("/:id", protect, deleteReading);

export default router;