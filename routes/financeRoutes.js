import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getMonthlySummary } from "../controllers/financeController.js";

const router = express.Router();

router.get("/monthly-summary", protect, getMonthlySummary);

export default router;
