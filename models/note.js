import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    // Plain text only
    title: { type: String, required: true },
    content: { type: String, required: true },

    // Formatting styles stored separately
    styles: {
      title: {
        fontSize: { type: String, default: "16px" },
        fontFamily: { type: String, default: "Arial" },
        color: { type: String, default: "#000000" },
      },
      content: {
        fontSize: { type: String, default: "16px" },
        fontFamily: { type: String, default: "Arial" },
        color: { type: String, default: "#000000" },
      },
    },

    // Note background color
    color: { type: String, default: "#FFFFFF" },

    // Flags
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    trashed: { type: Boolean, default: false },

    // Tags
    tags: [{ type: String }],

    // User reference
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);
export default Note;
