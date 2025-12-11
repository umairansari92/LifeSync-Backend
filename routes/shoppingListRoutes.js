import express from "express";
import {
  createShoppingList,
  getShoppingLists,
  getShoppingListById,
  updateShoppingList,
  deleteShoppingList,
  markListCompleted,
  linkToExpense,
  reuseShoppingList,
  generateWhatsAppLink,
} from "../controllers/shoppingListController.js";

import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/multerConfig.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/", protect, upload.single("receipt"), generalLimiter, createShoppingList);

router.get("/list", protect, generalLimiter, getShoppingLists);

router.get("/item/:id", protect, generalLimiter, getShoppingListById);
router.put("/update/:id", protect, generalLimiter, updateShoppingList);

router.delete("/delete/:id", protect, generalLimiter, deleteShoppingList);

router.put("/complete/:id", protect, generalLimiter, markListCompleted);

router.post("/expense/:id", protect, generalLimiter, linkToExpense);

router.post("/reuse/:id", protect, generalLimiter, reuseShoppingList);
router.post("/share/:id", protect, generalLimiter, generateWhatsAppLink);

// router.get("/totals", protect, generalLimiter, getTotals);


export default router;
