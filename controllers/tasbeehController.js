import TasbeehReading from "../models/TasbeehReading.js";

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
    const userId = req.user.id;
    const { period } = req.query;
    const now = new Date();

    let match = { user: new mongoose.Types.ObjectId(userId) };

    if (period === "monthly") {
      match.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    if (period === "yearly") {
      match.year = now.getFullYear();
    }

    const stats = await TasbeehReading.aggregate([
      { $match: match },
      { $group: { _id: "$name", total: { $sum: "$count" } } },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json(stats);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Error fetching stats" });
  }
};
