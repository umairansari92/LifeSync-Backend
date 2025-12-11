import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/", protect, generalLimiter, addExpense);
router.get("/", protect, generalLimiter, getExpenses);
router.put("/:id", protect, generalLimiter, updateExpense);
router.delete("/:id", protect, generalLimiter, deleteExpense);

export default router;