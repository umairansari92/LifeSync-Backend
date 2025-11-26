import Namaz from "../models/namazModel.js";

// Convert date to "YYYY-MM-DD"
const normalizeDate = (date) => {
  return new Date(date).toISOString().split("T")[0];
};

// Mark a prayer as offered/missed
export const markNamaz = async (req, res) => {
  try {
    const { date } = req.params;
    const { prayer, status } = req.body;

    const finalDate = normalizeDate(date);

    let namaz = await Namaz.findOne({
      user: req.user.id,
      date: finalDate,
    });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date: finalDate,
        prayers: {},
      });
    }

    namaz.prayers[prayer] = status;
    await namaz.save();

    res.status(200).json({
      message: `${prayer} updated`,
      namaz,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark multiple prayers
export const markMultiplePrayers = async (req, res) => {
  try {
    const { date } = req.params;
    const { prayers } = req.body;

    const finalDate = normalizeDate(date);

    let namaz = await Namaz.findOne({ user: req.user.id, date: finalDate });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date: finalDate,
        prayers: {},
      });
    }

    Object.keys(prayers).forEach((key) => {
      namaz.prayers[key] = prayers[key];
    });

    await namaz.save();
    res.status(200).json(namaz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's Namaz
export const getTodayNamaz = async (req, res) => {
  try {
    const today = normalizeDate(new Date());

    let namaz = await Namaz.findOne({
      user: req.user.id,
      date: today,
    });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date: today,
        prayers: {},
      });
    }

    res.status(200).json(namaz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Auto-save missed prayers
export const autoSaveMissedPrayers = async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const finalDate = normalizeDate(yesterday);

    let namaz = await Namaz.findOne({
      user: req.user.id,
      date: finalDate,
    });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date: finalDate,
        prayers: {
          fajr: false,
          zuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        },
        autoSaved: true,
      });
    }

    res.status(200).json(namaz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get history
export const getNamazHistory = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const filterDate = normalizeDate(startDate);

    const history = await Namaz.find({
      user: req.user.id,
      date: { $gte: filterDate },
    }).sort({ date: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
