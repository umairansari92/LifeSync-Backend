import express from "express";
import {
  markNamaz,
  getNamazHistory,
  getTodayNamaz,
  markMultiplePrayers,
  // 👈 Fetch Timings function add kiya gaya hai
  fetchAndSaveTimingsController, 
} from "../controllers/namazController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Namaz Status Routes ---

// Mark a single prayer
router.put("/:date/mark", protect, markNamaz);

// Mark multiple prayers
router.put("/:date/mark-multiple", protect, markMultiplePrayers);

// Get today's prayers (status + timings)
router.get("/today", protect, getTodayNamaz);

// Get history (7 or 30 days)
router.get("/history", protect, getNamazHistory);

// --- Timings Route ---

// 🆕 Naya route: Aaj ki Namaz ki timings Al Adhan API se fetch karke save karein
// (Aap isse client-side par bhi call kar sakte hain agar timings gayab hon)
router.post("/fetch-timings", protect, fetchAndSaveTimingsController); 


// 🛑 Yeh route hata diya gaya hai. Cron jobs ko server.js se run karna chahiye.
// router.get("/auto-save-missed", protect, autoSaveMissedPrayers); 

export default router;