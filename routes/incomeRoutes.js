import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addIncome,
  deleteIncome,
  getIncomes,
  updateIncome,
  
} from "../controllers/incomeController.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/", protect, generalLimiter, addIncome);
router.get("/", protect, generalLimiter, getIncomes);
router.put("/:id", protect, generalLimiter, updateIncome);
router.delete("/:id", protect, generalLimiter, deleteIncome);

export default router;
