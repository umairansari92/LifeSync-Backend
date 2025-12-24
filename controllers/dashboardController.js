// backend/controllers/dashboardController.js

import Note from "../models/note.js";
import User from "../models/user.js";
import Task from "../models/taskModel.js";
import Expense from "../models/expenseModel.js";
import asyncHandler from "express-async-handler";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";

// Birthday helper
const checkBirthday = (dob) => {
  if (!dob) return false;
  const today = new Date();
  const dobDate = new Date(dob);
  return (
    today.getMonth() === dobDate.getMonth() &&
    today.getDate() === dobDate.getDate()
  );
};

// Safe date formatter
const safeDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return isNaN(d) ? "N/A" : d.toLocaleDateString();
};

// Safe time formatter (Matches your NamazPage format)
const safeTime = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return isNaN(d)
    ? "N/A"
    : d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
};

export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { lat, lng } = req.query; // Get location from frontend

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

  // ================= NAMAZ LOGIC (DYNAMIC & SYNCED) =================
  let nextPrayerLabel = "Not available";

  try {
    const latitude = parseFloat(lat) || 24.8607; // Default: Karachi
    const longitude = parseFloat(lng) || 67.0011;
    const coords = new Coordinates(latitude, longitude);

    const params = CalculationMethod.Karachi();
    params.madhab = "hanafi"; // Standard for your region

    let prayerTimes = new PrayerTimes(coords, new Date(), params);
    let nextPrayerKey = prayerTimes.nextPrayer();

    // Handling "none" (if all prayers for today are done)
    if (!nextPrayerKey || nextPrayerKey === "none") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = new PrayerTimes(coords, tomorrow, params);
      nextPrayerLabel = `Fajr (${safeTime(tomorrowTimes.fajr)})`;
    } else {
      const prayerDate = prayerTimes.timeForPrayer(nextPrayerKey);
      const prayerName =
        nextPrayerKey.charAt(0).toUpperCase() + nextPrayerKey.slice(1);
      nextPrayerLabel = `${prayerName} (${safeTime(prayerDate)})`;
    }
  } catch (err) {
    console.error("Dashboard Namaz calculation failed:", err.message);
  }

  // ================= DATABASE QUERIES =================
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
      { $group: { _id: null, totalMonthlySpending: { $sum: "$amount" } } },
    ]),

    Expense.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, totalTodaySpending: { $sum: "$amount" } } },
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
    tasks.totalTasks > 0
      ? Math.round((tasks.completedTasks / tasks.totalTasks) * 100)
      : 0;

  const isBirthdayToday = checkBirthday(userProfile?.dob);

  res.status(200).json({
    user: {
      firstname: userProfile?.firstname || "User",
      lastname: userProfile?.lastname || "",
      email: userProfile?.email || "N/A",
      imageUrl: userProfile?.profileImageUrl || null,
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
        latestEntries: latestExpenses.map((exp) => ({
          title: exp.description || "Expense",
          value: `PKR ${Number(exp.amount || 0).toFixed(2)}`,
          date: safeDate(exp.date),
        })),
      },
      planner: {
        totalTasks: tasks.totalTasks,
        completedPercentage,
        latestEntries: latestTasks.map((task) => ({
          title: task.title || "Task",
          value: task.isCompleted ? "Completed" : "Pending",
          date: safeDate(task.dueDate),
        })),
      },
      notes: {
        totalNotes: noteSummary[0]?.totalNotes || 0,
        pinnedNotes: noteSummary[0]?.pinnedNotes || 0,
        latestEntries: latestNotes.map((note) => ({
          title: note.title || "Note",
          value: note.content
            ? note.content.substring(0, 30) + "..."
            : "No content",
          date: safeDate(note.createdAt),
        })),
      },
      habits: {
        streak: 42,
        completedToday: 5,
        pending: 1,
      },
      namaz: {
        doneToday: 4,
        nextPrayer: nextPrayerLabel,
        onTimeRate: "95%",
      },
    },
  });
});
