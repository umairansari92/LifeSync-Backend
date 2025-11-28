import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    linkedList: { type: mongoose.Schema.Types.ObjectId, ref: "ShoppingList" },
    category: {
      type: String,
      enum: [
        "food",
        "transport",
        "shopping",
        "bills",
        "health",
        "entertainment",
        "education",
        "other",
      ],
      default: "other",
    },
    date: { type: Date, default: Date.now },
    currency: { type: String, default: "PKR" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, trim: true, default: "" }, // ← add this
  },
  { timestamps: true }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
