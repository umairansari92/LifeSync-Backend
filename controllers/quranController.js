import QuranReading from "../models/QuranReading.js";

// Save or update daily reading
export const saveReading = async (req, res) => {
  try {
    const { type, name, count } = req.body;
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let record = await QuranReading.findOne({ user: userId, date: today, name });

    if (record) record.count += count;
    else record = new QuranReading({ user: userId, date: today, type, name, count });

    await record.save();
    res.status(200).json({ message: "Reading saved", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's reading
export const getTodayReading = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await QuranReading.find({ user: userId, date: today });
    res.status(200).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get history
export const getReadingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, period } = req.query;

    let filter = { user: userId };
    if (type) filter.type = type;

    const now = new Date();
    if (period === "daily") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.date = today;
    } else if (period === "monthly") filter.month = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,"0")}`;
    else if (period === "yearly") filter.year = now.getFullYear();

    const records = await QuranReading.find(filter).sort({ date: -1 });
    res.status(200).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Stats aggregation
export const getReadingStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, period } = req.query;
    const now = new Date();

    let match = { user: userId };
    if (type) match.type = type;
    if (period === "monthly") match.month = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,"0")}`;
    else if (period === "yearly") match.year = now.getFullYear();

    const stats = await QuranReading.aggregate([
      { $match: match },
      { $group: { _id: "$name", total: { $sum: "$count" } } },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
