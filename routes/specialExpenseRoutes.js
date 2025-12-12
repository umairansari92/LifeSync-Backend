import express from "express";
import {
  createCard,
  getCards,
  getCard,
  updateCard,
  deleteCard,
  addEntry,
  getEntries,
  updateEntry,
  deleteEntry,
} from "../controllers/specialExpenseController.js";
import protect from "../middleware/authMiddleware.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Cards
router.post("/cards", protect, generalLimiter, createCard);
router.get("/cards", protect, generalLimiter, getCards);
router.get("/cards/:id", protect, generalLimiter, getCard);
router.put("/cards/:id", protect, generalLimiter, updateCard);
router.delete("/cards/:id", protect, generalLimiter, deleteCard);

// Entries
router.post("/entries", protect, generalLimiter, addEntry);
router.get("/entries/:cardId", protect, generalLimiter, getEntries);
router.put("/entries/:id", protect, generalLimiter, updateEntry);
router.delete("/entries/:id", deleteEntry);

export default router;
