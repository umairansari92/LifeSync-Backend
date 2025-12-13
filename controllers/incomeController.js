import Income from "../models/incomeModel.js";

// Add Income
export const addIncome = async (req, res) => {
  try {
    const { title, amount, source, date, currency, description } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ message: "Title and amount are required" });
    }

    const income = await Income.create({
      title,
      amount,
      source: source || "other",
      date: date || Date.now(),
      currency: currency || "PKR",
      description: description || "",
      user: req.user.id,
    });

    res.status(201).json({ message: "Income added", income });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all incomes
export const getIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ user: req.user.id }).sort({ date: -1 });
    res.status(200).json(incomes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get monthly incomes (optional query for month/year)
export const getMonthlyIncome = async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = { user: req.user.id };

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const incomes = await Income.find(query).sort({ date: -1 });
    res.status(200).json(incomes);
  } catch (error) {
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

    Object.assign(income, req.body);
    await income.save();

    res.status(200).json({ message: "Income updated", income });
  } catch (error) {
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
    res.status(500).json({ message: error.message });
  }
};
