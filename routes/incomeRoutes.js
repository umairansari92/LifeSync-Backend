import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addIncome,
  deleteIncome,
  getIncomes,
  getMonthlyIncome,
  updateIncome,
} from "../controllers/incomeController.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/", protect, generalLimiter, addIncome);

// Smart GET route - uses getMonthlyIncome if query params exist, otherwise getIncomes
router.get("/", protect, generalLimiter, (req, res, next) => {
  // Check if month and year query params exist
  if (req.query.month && req.query.year) {
    return getMonthlyIncome(req, res, next);
  }
  return getIncomes(req, res, next);
});

router.put("/:id", protect, generalLimiter, updateIncome);
router.delete("/:id", protect, generalLimiter, deleteIncome);

export default router;
