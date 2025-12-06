import QuranReading from "../models/QuranReading.js";

// Save or update daily reading
export const saveReading = async (req, res) => {
  try {
    const { type, name, count } = req.body;
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let record = await QuranReading.findOne({ user: userId, date: today, name });

    if (record) {
      record.count += count;
    } else {
      record = new QuranReading({
        user: userId,
        date: today,
        type,
        name,
        count,
      });
    }

    await record.save();
    res.status(200).json({ message: "Reading saved", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get daily reading
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

// Get history (lifetime or filtered)
export const getReadingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, period } = req.query; // type: "surah" | "complete", period: "daily" | "monthly" | "yearly" | "lifetime"

    let filter = { user: userId };
    if (type) filter.type = type;

    const now = new Date();
    if (period === "daily") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.date = today;
    } else if (period === "monthly") {
      const month = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
      filter.month = month;
    } else if (period === "yearly") {
      filter.year = now.getFullYear();
    }

    const records = await QuranReading.find(filter).sort({ date: -1 });
    res.status(200).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
