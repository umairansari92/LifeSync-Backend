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

const router = express.Router();

router.post("/", protect, createNote);
router.get("/", protect, getNotes);

// Custom Routes FIRST
router.put("/trash/:id", protect, moveToTrash);
router.put("/restore/:id", protect, restoreNote);
router.delete("/permanent/:id", protect, deleteNotePermanent);
router.put("/pin/:id", protect, pinNote);
router.put("/archive/:id", protect, archiveNote);

router.get("/pinned/all", protect, getPinnedNotes);
router.get("/archived/all", protect, getArchivedNotes);
router.get("/trashed/all", protect, getTrashedNotes);

// LAST — do not move this up, warna sab break ho jayega
router.put("/:id", protect, updateNote);

export default router;
