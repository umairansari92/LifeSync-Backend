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

const router = express.Router();

// Save new reading or update existing for today
router.post("/", protect, saveTasbeeh);

// Get today's Tasbeeh
router.get("/today", protect, getTodayTasbeeh);

// Get Tasbeeh history
router.get("/history", protect, getTasbeehHistory);

// Get Tasbeeh stats
router.get("/stats", protect, getTasbeehStats);

// ✅ NEW: Update specific reading (Edit function)
router.put("/:id", protect, updateTasbeehReading);

// ✅ NEW: Delete specific reading (Delete function)
router.delete("/:id", protect, deleteTasbeehReading);

export default router;