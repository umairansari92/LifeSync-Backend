import Income from "../models/incomeModel.js";

// Add Income
export const addIncome = async (req, res) => {
  try {
    const { title, amount, source, month, year, note } = req.body;

    if (!title || !amount || !month || !year) {
      return res.status(400).json({ message: "Title, amount, month, and year are required" });
    }

    const income = await Income.create({
      title,
      amount,
      source: source || "other",
      month,
      year,
      note: note || "",
      user: req.user.id,
    });

    res.status(201).json({ message: "Income added successfully", income });
  } catch (error) {
    console.error("Add Income Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all incomes for logged-in user
export const getIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ user: req.user.id }).sort({ year: -1, month: -1 });
    res.status(200).json(incomes);
  } catch (error) {
    console.error("Get Incomes Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get monthly incomes (query: month=1-12, year=yyyy)
export const getMonthlyIncome = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const incomes = await Income.find({
      user: req.user.id,
      month: Number(month),
      year: Number(year),
    }).sort({ month: -1 });

    res.status(200).json(incomes);
  } catch (error) {
    console.error("Get Monthly Income Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update Income
export const updateIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const income = await Income.findOne({ _id: id, user: req.user.id });

    if (!income) {
      return res.status(404).json({ message: "Income not found or unauthorized" });
    }

    const { title, amount, source, month, year, note } = req.body;
    if (title !== undefined) income.title = title;
    if (amount !== undefined) income.amount = amount;
    if (source !== undefined) income.source = source;
    if (month !== undefined) income.month = month;
    if (year !== undefined) income.year = year;
    if (note !== undefined) income.note = note;

    await income.save();

    res.status(200).json({ message: "Income updated successfully", income });
  } catch (error) {
    console.error("Update Income Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete Income
export const deleteIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const income = await Income.findOneAndDelete({ _id: id, user: req.user.id });

    if (!income) {
      return res.status(404).json({ message: "Income not found or unauthorized" });
    }

    res.status(200).json({ message: "Income deleted successfully" });
  } catch (error) {
    console.error("Delete Income Error:", error);
    res.status(500).json({ message: error.message });
  }
};
