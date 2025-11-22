// backend/controllers/dashboardController.js

import Note from "../models/note.js";
import User from "../models/user.js";
import Task from "../models/taskModel.js";
import Expense from "../models/expenseModel.js";
import asyncHandler from "express-async-handler";

// Helper function to check for user's birthday
const checkBirthday = (dob) => {
    if (!dob) return false;
    const today = new Date();
    const dobDate = new Date(dob);
    return today.getMonth() === dobDate.getMonth() && today.getDate() === dobDate.getDate();
};

// @desc Get comprehensive data for the main dashboard screen
// @route GET /api/dashboard
// @access Private
export const getDashboardData = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    // --- Execute all data fetching promises in parallel ---
    const [
        userProfile,
        taskSummary,
        noteSummary,
        monthlyExpenses,
        todaySpending,
        latestExpenses, 
        latestTasks,
        latestNotes
    ] = await Promise.all([
        // 1. Fetch User Profile Data (email included for frontend overview)
        User.findById(userId).select('firstname lastname email dob profileImageUrl').lean(),

        // 2. Task Summary: Count total and completed tasks
        Task.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: { $sum: { $cond: ["$isCompleted", 1, 0] } }
                }
            }
        ]),

        // 3. Note Summary: Count total and pinned notes
        Note.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: null,
                    totalNotes: { $sum: 1 },
                    pinnedNotes: { $sum: { $cond: ["$isPinned", 1, 0] } }
                }
            },
        ]),

        // 4. Monthly Expenses: Total spending this month
        Expense.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalMonthlySpending: { $sum: "$amount" }
                }
            }
        ]),
        
        // 5. Today Spending: Total spending today
        Expense.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: todayStart, $lte: todayEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalTodaySpending: { $sum: "$amount" }
                }
            }
        ]),

        // 6. LATEST 3 EXPENSES (For Financial Summary Card)
        Expense.find({ user: userId })
            .select('description amount date') 
            .sort({ date: -1 })
            .limit(3)
            .lean(),

        // 7. LATEST 3 TASKS (For Daily Planner Card)
        Task.find({ user: userId })
            .select('title isCompleted dueDate')
            .sort({ createdAt: -1 })
            .limit(3)
            .lean(),

        // 8. LATEST 3 NOTES (For Notes Overview Card)
        Note.find({ user: userId })
            .select('title content createdAt')
            .sort({ createdAt: -1 })
            .limit(3)
            .lean(),
    ]);

    // Calculate Task Completion Percentage
    const tasks = taskSummary[0] || { totalTasks: 0, completedTasks: 0 };
    const completedPercentage = tasks.totalTasks > 0 ? (tasks.completedTasks / tasks.totalTasks) * 100 : 0;

    // Check for Birthday
    const isBirthdayToday = checkBirthday(userProfile?.dob);

    res.status(200).json({
        user: {
            firstname: userProfile?.firstname || 'User',
            lastname: userProfile?.lastname || '',
            email: userProfile?.email || 'N/A', 
            imageUrl: userProfile?.profileImageUrl,
            isBirthday: isBirthdayToday,
            age: isBirthdayToday && userProfile?.dob ? new Date().getFullYear() - new Date(userProfile.dob).getFullYear() : null,
        },
        dashboardSummary: {
            // Budget Overview
            budget: {
                todaySpending: (todaySpending[0]?.totalTodaySpending || 0).toFixed(2),
                monthlyTotal: (monthlyExpenses[0]?.totalMonthlySpending || 0).toFixed(2),
                monthlyRemaining: '750.00', // Mock
                nextDuePayment: '2025-12-05', // Mock
                latestEntries: latestExpenses.map(exp => ({ // Mapped latest expenses
                    title: exp.description,
                    value: `PKR ${exp.amount.toFixed(2)}`,
                    date: exp.date.toLocaleDateString(),
                })),
            },
            // Daily Planner (Tasks)
            planner: {
                totalTasks: tasks.totalTasks,
                completedPercentage: completedPercentage.toFixed(0),
                nextEvent: 'Team Meeting at 10 AM', // Mock - Needs Event Model
                latestEntries: latestTasks.map(task => ({ // Mapped latest tasks
                    title: task.title,
                    value: task.isCompleted ? 'Completed' : 'Pending',
                    date: task.dueDate ? task.dueDate.toLocaleDateString() : 'N/A',
                })),
            },
            // Notes
            notes: {
                totalNotes: noteSummary[0]?.totalNotes || 0,
                pinnedNotes: noteSummary[0]?.pinnedNotes || 0,
                latestEntries: latestNotes.map(note => ({ // Mapped latest notes
                    title: note.title,
                    value: note.content ? note.content.substring(0, 30) + '...' : 'No content',
                    date: note.createdAt.toLocaleDateString(),
                })),
            },
            // Habit Tracker & Namaz Tracker (Mocks)
            habits: {
                streak: 42,
                completedToday: 5,
                pending: 1,
            },
            namaz: {
                doneToday: 4, // Number
                nextPrayer: 'Maghrib (6:35 PM)',
                onTimeRate: '95%',
            }
        }
    });
});