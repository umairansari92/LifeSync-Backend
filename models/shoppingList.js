import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: String, default: "" },
  price: { type: Number, default: 0 },
  category: { type: String, default: "General" },
  note: { type: String, default: "" },
});

const shoppingListSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [itemSchema],
  market: { type: String, default: "" },
  totalPrice: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  receipt: { type: String, default: null },

  // New field to track expense entry if user wants to convert list into Expense
  linkedExpense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Expense",
    default: null,
  },

  createdAt: { type: Date, default: Date.now },
});

// Auto update totalPrice on save
shoppingListSchema.pre("save", function (next) {
  this.totalPrice = this.items.reduce(
    (acc, item) => acc + (item.price || 0),
    0
  );
  next();
});

// Auto delete after 3 months
shoppingListSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 }
);

export default mongoose.model("ShoppingList", shoppingListSchema);
