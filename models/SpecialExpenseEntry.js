import mongoose from "mongoose";

const SpecialExpenseEntrySchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpecialExpenseCard",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    item: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SpecialExpenseEntry", SpecialExpenseEntrySchema);
