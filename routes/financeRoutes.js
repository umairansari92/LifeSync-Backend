import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getMonthlySummary } from "../controllers/financeController.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/monthly-summary", protect, generalLimiter, getMonthlySummary);

export default router;
