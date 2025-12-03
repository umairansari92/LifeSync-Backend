import Note from "../models/note.js";

// Create Note
export const createNote = async (req, res) => {
  try {
    const { title, content, color } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const note = await Note.create({
      user: req.user.id,
      title,
      content,
      color,
    });

    res.status(201).json({ message: "Note created", note });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all notes (exclude trashed)
export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      user: req.user.id,
      trashed: false,
      archived: false,
    }).sort({ updatedAt: -1 });

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Note
export const updateNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { ...req.body },
      { new: true }
    );

    if (!note) return res.status(404).json({ message: "Note not found" });

    res.status(200).json({ message: "Note updated", note });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Move to Trash
export const moveToTrash = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { trashed: true, pinned: false, archived: false },
      { new: true }
    );

    if (!note) return res.status(404).json({ message: "Note not found" });

    res.status(200).json({ message: "Moved to trash" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Restore from Trash
export const restoreNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { trashed: false, archived: false },
      { new: true }
    );

    if (!note) return res.status(404).json({ message: "Note not found" });

    res.status(200).json({ message: "Note restored" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Permanent delete
export const deleteNotePermanent = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!note) return res.status(404).json({ message: "Note not found" });

    res.status(200).json({ message: "Note deleted permanently" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle Pin
export const pinNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Toggle pinned
    note.pinned = !note.pinned;

    // If pinned, unarchive
    if (note.pinned) note.archived = false;

    await note.save();

    res.status(200).json({ message: "Pin status updated", note });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// Archive Note
// Toggle Archive
export const archiveNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Toggle archived
    note.archived = !note.archived;

    // If archived, unpin
    if (note.archived) note.pinned = false;

    await note.save();

    res.status(200).json({ message: "Archive status updated", note });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// Get pinned notes
export const getPinnedNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      user: req.user.id,
      pinned: true,
      trashed: false,
    });

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get archived notes
export const getArchivedNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      user: req.user.id,
      archived: true,
      trashed: false,
    });

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get trashed notes
export const getTrashedNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      user: req.user.id,
      trashed: true,
    });

    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
