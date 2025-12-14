import Namaz from "../models/namazModel.js";
import cron from "node-cron";

// Mark a prayer as offered/missed
export const markNamaz = async (req, res) => {
  try {
    const { date } = req.params; // YYYY-MM-DD
    const { prayer, status } = req.body;

    // Convert frontend prayer names to model names
    const prayerMap = {
      fajr: "fajr",
      zuhr: "zuhr",
      asr: "asr",
      maghrib: "maghrib",
      isha: "isha",
    };

    const modelPrayer = prayerMap[prayer] || prayer;

    // Use date as string (YYYY-MM-DD) - consistent with model
    const dateString = date; // Already in YYYY-MM-DD format

    let namaz = await Namaz.findOne({
      user: req.user.id,
      date: dateString,
    });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date: dateString,
        prayers: {
          fajr: false,
          zuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        },
      });
    }

    namaz.prayers[modelPrayer] = status;
    await namaz.save();

    res.status(200).json({
      message: `${prayer} marked as ${status ? "offered" : "missed"}`,
      namaz: formatNamazResponse(namaz),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark multiple prayers
export const markMultiplePrayers = async (req, res) => {
  try {
    const { date } = req.params; // YYYY-MM-DD
    const { prayers } = req.body; // { fajr: false, zuhr: false, ... }

    // Use date as string (YYYY-MM-DD) - consistent with model
    const dateString = date; // Already in YYYY-MM-DD format

    let namaz = await Namaz.findOne({ user: req.user.id, date: dateString });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date: dateString,
        prayers: {
          fajr: false,
          zuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        },
      });
    }

    // Update multiple prayers
    Object.keys(prayers).forEach((prayer) => {
      const prayerMap = {
        fajr: "fajr",
        zuhr: "zuhr",
        asr: "asr",
        maghrib: "maghrib",
        isha: "isha",
      };
      const modelPrayer = prayerMap[prayer];
      if (modelPrayer) {
        namaz.prayers[modelPrayer] = prayers[prayer];
      }
    });

    await namaz.save();
    res.status(200).json({ message: "Prayers updated", namaz });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's Namaz
export const getTodayNamaz = async (req, res) => {
  try {
    // Get today's date in YYYY-MM-DD format (consistent with model)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD

    let namaz = await Namaz.findOne({
      user: req.user.id,
      date: todayString,
    });

    if (namaz) {
      res.status(200).json(formatNamazResponse(namaz));
    } else {
      // ✅ AUTO-CREATE new entry for today with all false
      namaz = await Namaz.create({
        user: req.user.id,
        date: todayString,
        prayers: {
          fajr: false,
          zuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        },
      });

      res.status(200).json(formatNamazResponse(namaz));
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Auto-save missed prayers for yesterday
export const autoSaveMissedPrayers = async (req, res) => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Convert to YYYY-MM-DD format
      const yesterdayString = yesterday.toISOString().split("T")[0];
      
      // Check if yesterday's entry exists
      let yesterdayNamaz = await Namaz.findOne({ date: yesterdayString });

      if (!yesterdayNamaz) {
        await Namaz.create({
          user: null, // ya loop kar ke saare users ke liye save kar sakte ho
          date: yesterdayString,
          prayers: {
            fajr: false,
            zuhr: false,
            asr: false,
            maghrib: false,
            isha: false,
          },
          autoSaved: true,
        });
        console.log("Yesterday's prayers auto-saved");
      } else {
        console.log("Yesterday's entry already exists");
      }

      // Optionally reset today's prayers for all users
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD

      // Loop through all users (agar multi-user system hai)
      const users = await Namaz.distinct("user");
      for (let userId of users) {
        let todayNamaz = await Namaz.findOne({ user: userId, date: todayString });
        if (!todayNamaz) {
          await Namaz.create({
            user: userId,
            date: todayString,
            prayers: {
              fajr: false,
              zuhr: false,
              asr: false,
              maghrib: false,
              isha: false,
            },
          });
        }
      }
    } catch (err) {
      console.error("Midnight job failed:", err);
    }
  });
};

// Get history for last N days
export const getNamazHistory = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);
    const startDateString = startDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Since date is stored as String in YYYY-MM-DD format, we can use string comparison
    const history = await Namaz.find({
      user: req.user.id,
      date: { $gte: startDateString }, // String comparison works for YYYY-MM-DD format
    }).sort({ date: -1 });

    // Format response for frontend
    const formattedHistory = history.map((namaz) => formatNamazResponse(namaz));

    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to convert model names to frontend names
const formatNamazResponse = (namaz) => {
  const date =
    typeof namaz.date === "string"
      ? namaz.date
      : namaz.date.toISOString().split("T")[0];

  return {
    date,
    prayers: {
      fajr: namaz.prayers.fajr,
      zuhr: namaz.prayers.zuhr,
      asr: namaz.prayers.asr,
      maghrib: namaz.prayers.maghrib,
      isha: namaz.prayers.isha,
    },
  };
};
