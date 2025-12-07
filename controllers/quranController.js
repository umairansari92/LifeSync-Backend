// src/controllers/quranController.js

import QuranReading from "../models/QuranReading.js";

// Helper to get start of today
const getStartOfToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

// 1. Save or update daily reading (Optimized for Tasbeeh-like flow)
export const saveReading = async (req, res) => {
    try {
        const { type, name, count } = req.body;
        const userId = req.user.id;
        const today = getStartOfToday();

        if (count <= 0) {
             return res.status(400).json({ message: "Count must be positive." });
        }

        // Find existing record for TODAY and that SPECIFIC SURAH/ITEM
        let record = await QuranReading.findOne({ 
            user: userId, 
            date: today, 
            name 
        });

        if (record) {
            record.count += count; // Increment existing count
        } else {
            // Create a new record
            record = new QuranReading({ user: userId, date: today, type, name, count });
        }

        await record.save();
        res.status(200).json({ message: "Reading saved", record });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// 2. Get today's reading
export const getTodayReading = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = getStartOfToday();

        const records = await QuranReading.find({ user: userId, date: today }).sort({ createdAt: 1 });
        res.status(200).json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// 3. Get history (Refined to use 'days' parameter for flexibility)
export const getReadingHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { days, type } = req.query; // Using 'days' instead of 'period'

        let filter = { user: userId };
        if (type) filter.type = type;

        if (days) {
            const numDays = parseInt(days);
            if (!isNaN(numDays) && numDays > 0) {
                const pastDate = getStartOfToday();
                pastDate.setDate(pastDate.getDate() - numDays);
                
                // Filter records from the start of pastDate up to now
                filter.date = { $gte: pastDate };
            }
        }

        // Grouping logic for history: We want total count per day.
        const history = await QuranReading.aggregate([
            { $match: filter },
            { 
                $group: { 
                    _id: "$date", 
                    totalCount: { $sum: "$count" },
                    // Optionally include details about the surahs read on that day
                    details: { $push: { name: "$name", count: "$count" } }
                } 
            },
            { $sort: { _id: -1 } }, // Sort by date descending
            { $limit: 30 } // Limit to last 30 unique days for performance
        ]);
        
        // Rename _id to 'date' for client readability
        const formattedHistory = history.map(item => ({
            date: item._id,
            totalCount: item.totalCount,
            details: item.details
        }));

        res.status(200).json(formattedHistory);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// 4. Stats aggregation
export const getReadingStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, period } = req.query;
        const now = new Date();

        let match = { user: userId };
        if (type) match.type = type;
        
        // Period filtering using Model's pre-save fields
        if (period === "monthly") {
            const monthYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
            match.month = monthYear;
        } else if (period === "yearly") {
            match.year = now.getFullYear();
        }

        const stats = await QuranReading.aggregate([
            { $match: match },
            { 
                $group: { 
                    _id: "$name", 
                    total: { $sum: "$count" }, 
                    records: { $sum: 1 } // Count how many times this surah was logged
                } 
            },
            { $sort: { total: -1 } },
        ]);

        res.status(200).json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};