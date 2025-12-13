import Income from "../models/incomeModel.js";

export const addIncome = async (req, res) => {
  try {
    const income = await Income.create({
      ...req.body,
      user: req.user.id,
    });
    res.status(201).json(income);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getMonthlyIncome = async (req, res) => {
  const { month, year } = req.query;
  const incomes = await Income.find({
    user: req.user.id,
    month,
    year,
  });
  res.json(incomes);
};
