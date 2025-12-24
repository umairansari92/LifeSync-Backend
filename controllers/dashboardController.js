// backend/controllers/dashboardController.js

import Note from "../models/note.js";
import User from "../models/user.js";
import Task from "../models/taskModel.js";
import Expense from "../models/expenseModel.js";
import asyncHandler from "express-async-handler";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan"; // 1. Import Adhan

// Helper function to check for user's birthday
const checkBirthday = (dob) => {
  if (!dob) return false;
  const today = new Date();
  const dobDate = new Date(dob);
  return (
    today.getMonth() === dobDate.getMonth() &&
    today.getDate() === dobDate.getDate()
  );
};

export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

  // --- 2. Adhan Logic for Prayer Times ---
  // Karachi Coordinates (Inhe aap user profile se dynamic bhi bana sakte hain)
  const coords = new Coordinates(24.8607, 67.0011);
  const params = CalculationMethod.Karachi();
  const prayerTimes = new PrayerTimes(coords, now, params);

  // Format Next Prayer String
  const nextPrayerKey = prayerTimes.nextPrayer();
  const nextPrayerName =
    nextPrayerKey.charAt(0).toUpperCase() + nextPrayerKey.slice(1);
  const nextPrayerTime = prayerTimes
    .timeForPrayer(nextPrayerKey)
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  // --- Execute all data fetching promises in parallel ---
  const [
    userProfile,
    taskSummary,
    noteSummary,
    monthlyExpenses,
    todaySpending,
    latestExpenses,
    latestTasks,
    latestNotes,
  ] = await Promise.all([
    User.findById(userId)
      .select("firstname lastname email dob profileImageUrl")
      .lean(),

    Task.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: ["$isCompleted", 1, 0] } },
        },
      },
    ]),

    Note.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalNotes: { $sum: 1 },
          pinnedNotes: { $sum: { $cond: ["$isPinned", 1, 0] } },
        },
      },
    ]),

    Expense.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalMonthlySpending: { $sum: "$amount" },
        },
      },
    ]),

    Expense.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalTodaySpending: { $sum: "$amount" },
        },
      },
    ]),

    Expense.find({ user: userId })
      .select("description amount date")
      .sort({ date: -1 })
      .limit(3)
      .lean(),

    Task.find({ user: userId })
      .select("title isCompleted dueDate")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),

    Note.find({ user: userId })
      .select("title content createdAt")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
  ]);

  const tasks = taskSummary[0] || { totalTasks: 0, completedTasks: 0 };
  const completedPercentage =
    tasks.totalTasks > 0 ? (tasks.completedTasks / tasks.totalTasks) * 100 : 0;
  const isBirthdayToday = checkBirthday(userProfile?.dob);

  res.status(200).json({
    user: {
      firstname: userProfile?.firstname || "User",
      lastname: userProfile?.lastname || "",
      email: userProfile?.email || "N/A",
      imageUrl: userProfile?.profileImageUrl,
      isBirthday: isBirthdayToday,
      age:
        isBirthdayToday && userProfile?.dob
          ? new Date().getFullYear() - new Date(userProfile.dob).getFullYear()
          : null,
    },
    dashboardSummary: {
      budget: {
        todaySpending: (todaySpending[0]?.totalTodaySpending || 0).toFixed(2),
        monthlyTotal: (monthlyExpenses[0]?.totalMonthlySpending || 0).toFixed(
          2
        ),
        monthlyRemaining: "750.00",
        nextDuePayment: "2025-12-05",
        latestEntries: latestExpenses.map((exp) => ({
          title: exp.description,
          value: `PKR ${exp.amount.toFixed(2)}`,
          date: exp.date.toLocaleDateString(),
        })),
      },
      planner: {
        totalTasks: tasks.totalTasks,
        completedPercentage: completedPercentage.toFixed(0),
        nextEvent: "Team Meeting at 10 AM",
        latestEntries: latestTasks.map((task) => ({
          title: task.title,
          value: task.isCompleted ? "Completed" : "Pending",
          date: task.dueDate ? task.dueDate.toLocaleDateString() : "N/A",
        })),
      },
      notes: {
        totalNotes: noteSummary[0]?.totalNotes || 0,
        pinnedNotes: noteSummary[0]?.pinnedNotes || 0,
        latestEntries: latestNotes.map((note) => ({
          title: note.title,
          value: note.content
            ? note.content.substring(0, 30) + "..."
            : "No content",
          date: note.createdAt.toLocaleDateString(),
        })),
      },
      habits: {
        streak: 42,
        completedToday: 5,
        pending: 1,
      },
      namaz: {
        doneToday: 4,
        // 3. Dynamic Adhan Data
        nextPrayer: `${nextPrayerName} (${nextPrayerTime})`,
        onTimeRate: "95%",
      },
    },
  });
});
