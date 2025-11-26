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

const router = express.Router();

router.post("/", protect, upload.single("receipt"), createShoppingList);

router.get("/list", protect, getShoppingLists);

router.get("/item/:id", protect, getShoppingListById);

router.put("/update/:id", protect, updateShoppingList);

router.delete("/delete/:id", protect, deleteShoppingList);

router.put("/complete/:id", protect, markListCompleted);

router.post("/expense/:id", protect, linkToExpense);

router.post("/reuse/:id", protect, reuseShoppingList);

router.post("/share/:id", protect, generateWhatsAppLink);



export default router;
