import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createNote,
  getNotes,
  updateNote,
  moveToTrash,
  restoreNote,
  deleteNotePermanent,
  pinNote,
  archiveNote,
  getPinnedNotes,
  getArchivedNotes,
  getTrashedNotes
} from "../controllers/noteController.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/", protect, generalLimiter, createNote);
router.get("/", protect, generalLimiter, getNotes);

// Custom Routes FIRST
router.put("/trash/:id", protect, generalLimiter, moveToTrash);
router.put("/restore/:id", protect, generalLimiter, restoreNote);
router.delete("/permanent/:id", protect, generalLimiter, deleteNotePermanent);
router.put("/pin/:id", protect, generalLimiter, pinNote);
router.put("/archive/:id", protect, generalLimiter, archiveNote);

router.get("/pinned/all", protect, generalLimiter, getPinnedNotes);
router.get("/archived/all", protect, generalLimiter, getArchivedNotes);
router.get("/trashed/all", protect, generalLimiter, getTrashedNotes);
// LAST — do not move this up, warna sab break ho jayega
router.put("/:id", protect, generalLimiter, updateNote);

export default router;
