import TasbeehReading from "../models/TasbeehReading.js";
import mongoose from "mongoose"; // <--- ISKO LAZMI IMPORT KAREIN


// Save or update daily Tasbeeh
export const saveTasbeeh = async (req, res) => {
  try {
    const { name, count } = req.body;
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let record = await TasbeehReading.findOne({ user: userId, date: today, name });

    if (record) {
      record.count += count;
    } else {
      record = new TasbeehReading({ user: userId, date: today, name, count });
    }

    await record.save();
    res.status(200).json({ message: "Tasbeeh saved", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's Tasbeeh
export const getTodayTasbeeh = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await TasbeehReading.find({ user: userId, date: today });
    res.status(200).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Tasbeeh history
export const getTasbeehHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period } = req.query;

    const now = new Date();
    let filter = { user: userId };

    if (period === "daily") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.date = today;
    } else if (period === "monthly") {
      filter.month = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    } else if (period === "yearly") {
      filter.year = now.getFullYear();
    }

    const records = await TasbeehReading.find(filter).sort({ date: -1 });
    res.status(200).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Stats aggregation
// FIXED STATS FUNCTION - FINAL
export const getTasbeehStats = async (req, res) => {
  try {
    const userId = req.user.id; // req.user.id string
    const { period } = req.query;
    const now = new Date();

    // Convert string to ObjectId for aggregation match
    let match = { user: new mongoose.Types.ObjectId(userId) };

    if (period === "monthly") {
      match.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    } else if (period === "yearly") {
      match.year = now.getFullYear();
    }
    // lifetime -> no extra filter

    const stats = await TasbeehReading.aggregate([
      { $match: match },
      { $group: { _id: "$name", total: { $sum: "$count" } } },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json(stats); // return as array [{_id: "Tasbeeh Name", total: 123}, ...]
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Error fetching stats" });
  }
};


// ✅ NEW: Update Tasbeeh Reading (PUT /api/tasbeeh/:id)
export const updateTasbeehReading = async (req, res) => {
    try {
        const { id } = req.params;
        const { count } = req.body;
        const userId = req.user.id;

        // Validation
        if (typeof count !== 'number' || count < 1) {
            return res.status(400).json({ message: "Count must be a number greater than 0." });
        }

        // Find the record by ID and ensure it belongs to the authenticated user
        const record = await TasbeehReading.findOneAndUpdate(
            { _id: id, user: userId },
            { count: count },
            { new: true, runValidators: true } // new: true returns the updated document
        );

        if (!record) {
            return res.status(404).json({ message: "Tasbeeh record not found or does not belong to user." });
        }

        res.status(200).json({ message: "Record updated successfully", record });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "Failed to update record." });
    }
};


// ✅ NEW: Delete Tasbeeh Reading (DELETE /api/tasbeeh/:id)
export const deleteTasbeehReading = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find and remove the record by ID, ensuring it belongs to the authenticated user
        const record = await TasbeehReading.findOneAndDelete({ _id: id, user: userId });

        if (!record) {
            return res.status(404).json({ message: "Tasbeeh record not found or does not belong to user." });
        }

        res.status(200).json({ message: "Record deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ message: "Failed to delete record." });
    }
};