import Expense from "../models/expenseModel.js";

// Create Expense
export const addExpense = async (req, res) => {
  try {
    const { title, amount, category, date, currency } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ message: "Title and amount are required" });
    }

    const expense = await Expense.create({
      title,
      amount,
      category: category ? category.toLowerCase() : "other",
      date: date || Date.now(),
      currency: currency || "PKR",
      user: req.user.id,
    });

    res.status(201).json({ message: "Expense added", expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all expenses for logged-in user
export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id })
      .populate("category")
      .sort({ date: -1 });

    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Expense
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!expense) {
      return res
        .status(404)
        .json({ message: "Expense not found or unauthorized" });
    }

    const updates = req.body;
    Object.assign(expense, updates);

    await expense.save();

    res.status(200).json({ message: "Expense updated", expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Expense
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!expense) {
      return res
        .status(404)
        .json({ message: "Expense not found or unauthorized" });
    }

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
