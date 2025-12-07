import QuranReading from "../models/QuranReading.js";
import mongoose from "mongoose"; // <-- Added for ObjectId conversion in stats

// Helper to get start of today
const getStartOfToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

// 1. Save or update daily reading (Same as Tasbeeh Flow)
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

        // Sort by creation time to show in logging order
        const records = await QuranReading.find({ user: userId, date: today }).sort({ createdAt: 1 });
        res.status(200).json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// 3. Get history (Simplified and sorted like Tasbeeh history)
export const getReadingHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { period, type } = req.query; 

        const now = new Date();
        let filter = { user: userId };
        if (type) filter.type = type;

        // Filtering logic is the same as Tasbeeh history
        if (period === "daily") {
            const today = getStartOfToday();
            filter.date = today;
        } else if (period === "monthly") {
            filter.month = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
        } else if (period === "yearly") {
            filter.year = now.getFullYear();
        }

        // Tasbeeh history finds all records based on filter and sorts by date
        const records = await QuranReading.find(filter).sort({ date: -1, createdAt: -1 });
        res.status(200).json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// 4. Stats aggregation (Same as Tasbeeh Stats)
export const getReadingStats = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { type, period } = req.query;
        const now = new Date();

        let match = { user: new mongoose.Types.ObjectId(userId) };
        if (type) match.type = type;
        
        if (period === "monthly") {
            match.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        } else if (period === "yearly") {
            match.year = now.getFullYear();
        }

        const stats = await QuranReading.aggregate([
            { $match: match },
            { $group: { _id: "$name", total: { $sum: "$count" } } },
            { $sort: { total: -1 } },
        ]);

        res.status(200).json(stats);
    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ message: "Error fetching stats" });
    }
};


// 5. Update specific reading (CRUD - Same as Tasbeeh Update)
export const updateReading = async (req, res) => {
    try {
        const { id } = req.params;
        const { count, name } = req.body; // Allows updating count and name
        const userId = req.user.id;

        if (typeof count !== 'number' || count < 1) {
            return res.status(400).json({ message: "Count must be a number greater than 0." });
        }
        
        let updateFields = { count };
        if (name) updateFields.name = name;

        // Find the record by ID and ensure it belongs to the authenticated user
        const record = await QuranReading.findOneAndUpdate(
            { _id: id, user: userId },
            updateFields,
            { new: true, runValidators: true } 
        );

        if (!record) {
            return res.status(404).json({ message: "Quran record not found or does not belong to user." });
        }

        res.status(200).json({ message: "Record updated successfully", record });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "Failed to update record." });
    }
};


// 6. Delete specific reading (CRUD - Same as Tasbeeh Delete)
export const deleteReading = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const record = await QuranReading.findOneAndDelete({ _id: id, user: userId });

        if (!record) {
            return res.status(404).json({ message: "Quran record not found or does not belong to user." });
        }

        res.status(200).json({ message: "Record deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ message: "Failed to delete record." });
    }
};