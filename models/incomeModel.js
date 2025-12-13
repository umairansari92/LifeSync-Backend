import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["salary", "wages", "freelance", "business", "other"],
      default: "other",
    },
    date: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 1900 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Income", incomeSchema);
