import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  markCompleted,
} from "../controllers/taskController.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/", protect, generalLimiter, createTask);
router.get("/", protect, generalLimiter, getTasks);
router.put("/:id", protect, generalLimiter, updateTask);
router.delete("/:id", protect, generalLimiter, deleteTask);
router.put("/complete/:id", protect, generalLimiter, markCompleted);
export default router;
