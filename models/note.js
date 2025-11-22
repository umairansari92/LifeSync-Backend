import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    trashed: { type: Boolean, default: false },
    color: { type: String, default: "#FFFFFF" },
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);
export default Note;
