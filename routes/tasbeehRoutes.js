import express from "express";
import { 
    saveTasbeeh, 
    getTodayTasbeeh, 
    getTasbeehHistory, 
    getTasbeehStats, 
    updateTasbeehReading, // <-- New Import
    deleteTasbeehReading  // <-- New Import
} from "../controllers/tasbeehController.js";
import { protect } from "../middleware/authMiddleware.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Save new reading or update existing for today
router.post("/", protect, generalLimiter, saveTasbeeh);

// Get today's Tasbeeh
router.get("/today", protect, generalLimiter, getTodayTasbeeh);

// Get Tasbeeh history
router.get("/history", protect, generalLimiter, getTasbeehHistory);

// Get Tasbeeh stats
router.get("/stats", protect, generalLimiter, getTasbeehStats);

// ✅ NEW: Update specific reading (Edit function)
router.put("/:id", protect, generalLimiter, updateTasbeehReading);

// ✅ NEW: Delete specific reading (Delete function)
router.delete("/:id", protect, generalLimiter, deleteTasbeehReading);

export default router;