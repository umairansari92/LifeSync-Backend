import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addIncome,
  getIncomes,
  updateIncome,
  deleteIncome,
} from "../controllers/incomeController.js";

const router = express.Router();

router.post("/", protect, addIncome);
router.get("/", protect, getIncomes);
router.put("/:id", protect, updateIncome);
router.delete("/:id", protect, deleteIncome);

export default router;
