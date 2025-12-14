import Income from "../models/incomeModel.js";

// helper: create date from month/year
// helper: create date from month/year
const makeDate = (month, year) => new Date(year, month - 1, 1);

// Add Income
export const addIncome = async (req, res) => {
  try {
    const { title, amount, source, month, year, note, date } = req.body;

    if (!title || !amount || !month || !year) {
      return res.status(400).json({ message: "Title, amount, month, and year are required" });
    }

    // Agar user ne date bheji hai to wahi use karo, warna month/year se bana lo
    const finalDate = date ? new Date(date) : new Date(year, month - 1, 1);

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

    res.status(201).json(income);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};




// Get all incomes
export const getIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ user: req.user.id })
      .sort({ date: -1 });

    res.json(incomes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Get monthly income
export const getMonthlyIncome = async (req, res) => {
  try {
    const { month, year } = req.query;

    const incomes = await Income.find({
      user: req.user.id,
      month: Number(month),
      year: Number(year),
    }).sort({ date: -1 });

    res.json(incomes);
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

    // Agar date explicitly bheji gayi hai to wahi set karo
    if (req.body.date) {
      income.date = new Date(req.body.date);
    }

    await income.save();
    res.json(income);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
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
