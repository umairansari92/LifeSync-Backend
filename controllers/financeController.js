import Income from "../models/incomeModel.js";
import Expense from "../models/expenseModel.js";

export const getMonthlySummary = async (req, res) => {
  const { month, year } = req.query;

  const incomes = await Income.find({ user: req.user.id, month, year });
  const expenses = await Expense.find({ user: req.user.id, month, year });

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  // previous month
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const prevIncomes = await Income.find({
    user: req.user.id,
    month: prevMonth,
    year: prevYear,
  });
  const prevExpenses = await Expense.find({
    user: req.user.id,
    month: prevMonth,
    year: prevYear,
  });

  const carryForward =
    prevIncomes.reduce((s, i) => s + i.amount, 0) -
    prevExpenses.reduce((s, e) => s + e.amount, 0);

  res.json({
    totalIncome,
    totalExpense,
    carryForward,
    finalBalance: totalIncome + carryForward - totalExpense,
  });
};
