import mongoose from "mongoose";

const SpecialExpenseCardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SpecialExpenseCard", SpecialExpenseCardSchema);
