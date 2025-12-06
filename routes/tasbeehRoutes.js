import express from "express";
import { saveTasbeeh, getTodayTasbeeh, getTasbeehHistory, getTasbeehStats } from "../controllers/tasbeehController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Save today's Tasbeeh
router.post("/", protect, saveTasbeeh);

// Get today's Tasbeeh
router.get("/today", protect, getTodayTasbeeh);

// Get Tasbeeh history
router.get("/history", protect, getTasbeehHistory);

// Get Tasbeeh stats
router.get("/stats", protect, getTasbeehStats);

export default router;
