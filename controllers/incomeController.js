import Income from "../models/incomeModel.js";

// helper: create date from month/year
const makeDate = (month, year) => new Date(year, month - 1, 1);

// Add Income
export const addIncome = async (req, res) => {
  try {
    const { title, amount, source, month, year, note, date } = req.body;

    if (!title || !amount || !month || !year) {
      return res.status(400).json({ message: "Title, amount, month, and year are required" });
    }

    // Agar user ne date bheji hai to use karo, warna month/year se bana lo
    const finalDate = date ? new Date(date) : makeDate(month, year);

    const income = await Income.create({
      title,
      amount,
      source: source || "other",
      month,
      year,
      date: finalDate,
      note: note || "",
      user: req.user.id,
    });

    res.status(201).json({
      ...income.toObject(),
      date: finalDate,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Get all incomes
export const getIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ user: req.user.id })
      .sort({ year: -1, month: -1 });

    const formatted = incomes.map(i => ({
      ...i.toObject(),
      date: makeDate(i.month, i.year),
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get monthly income
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
    });

    const formatted = incomes.map(i => ({
      ...i.toObject(),
      date: makeDate(i.month, i.year),
    }));

    res.json(formatted);
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
      return res.status(404).json({ message: "Income not found" });
    }

    Object.assign(income, req.body);

    // Agar month/year ya date update ho rahi hai to final date set karo
    if (req.body.date) {
      income.date = new Date(req.body.date);
    } else if (req.body.month && req.body.year) {
      income.date = makeDate(req.body.month, req.body.year);
    }

    await income.save();

    res.json({
      ...income.toObject(),
      date: income.date,
    });
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
      return res.status(404).json({ message: "Income not found" });
    }

    res.json({ message: "Income deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
