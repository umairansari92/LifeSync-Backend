import Namaz from "../models/namazModel.js";

// Mark a prayer as offered/missed
export const markNamaz = async (req, res) => {
  try {
    const { date } = req.params; // YYYY-MM-DD
    const { prayer, status } = req.body; // prayer name and boolean

    let namaz = await Namaz.findOne({ user: req.user.id, date });

    if (!namaz) {
      namaz = await Namaz.create({ user: req.user.id, date });
    }

    namaz.prayers[prayer] = status;
    await namaz.save();

    res.status(200).json({ message: `${prayer} marked as ${status ? "offered" : "missed"}`, namaz });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's Namaz
export const getTodayNamaz = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const namaz = await Namaz.findOne({ user: req.user.id, date: today });
    res.status(200).json(namaz || { date: today, prayers: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get history for last N days
export const getNamazHistory = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    const history = await Namaz.find({
      user: req.user.id,
      date: { $gte: startDate.toISOString().split("T")[0] },
    }).sort({ date: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
