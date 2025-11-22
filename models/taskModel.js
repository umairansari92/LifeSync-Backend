import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      default: null,
    },
    time: {
      type: String,
      default: "",
    },
    day: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    repeat: {
      type: String,
      enum: ["none", "daily", "weekly"],
      default: "none",
    },
    category: {
      work: { type: Boolean, default: false },
      study: { type: Boolean, default: false },
      personal: { type: Boolean, default: false },
      event: { type: Boolean, default: false },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;