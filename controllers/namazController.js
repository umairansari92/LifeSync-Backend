import Namaz from "../models/namazModel.js";
import cron from "node-cron";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";

// --- HELPER: Local Calculation (Coordinates + Hijri Offset) ---
// Note: order is (lat, lng, hijriOffset, tz) to match the call below
const getLocalPrayerData = (lat, lng, hijriOffset = 0, tz = "Asia/Karachi") => {
  // 1. Coordinates setup
  const latitude = parseFloat(lat) || 24.8607;
  const longitude = parseFloat(lng) || 67.0011;
  const coords = new Coordinates(latitude, longitude);

  const date = new Date();

  // Method and Madhab setup
  const params = CalculationMethod.Karachi();
  params.madhab = "hanafi"; // Pakistan/India ke liye accurate Asr timing

  const prayerTimes = new PrayerTimes(coords, date, params);

  // 2. Hijri Date with Manual Offset Logic
  const adjustedDate = new Date();
  adjustedDate.setDate(adjustedDate.getDate() + parseInt(hijriOffset));

  const hijriDate = new Intl.DateTimeFormat("en-u-ca-islamic-uma-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(adjustedDate);

  // 3. Time Formatting Helper
  const formatTime = (time) => {
    try {
      return time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: tz || "Asia/Karachi",
      });
    } catch (e) {
      // Agar invalid timezone aaye toh Karachi fallback use karein taake crash na ho
      return time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Karachi",
      });
    }
  };

  return {
    hijriDate,
    timings: {
      fajr: formatTime(prayerTimes.fajr),
      sunrise: formatTime(prayerTimes.sunrise),
      zuhr: formatTime(prayerTimes.dhuhr),
      asr: formatTime(prayerTimes.asr),
      maghrib: formatTime(prayerTimes.maghrib),
      isha: formatTime(prayerTimes.isha),
    },
  };
};

// --- GET TODAY'S DATA (Main Endpoint) ---
export const getTodayNamaz = async (req, res) => {
  try {
    // Destructure tz from query
    const { lat, lng, hijriOffset = 0, tz } = req.query;

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    // FIX: Pass all parameters in correct order to helper
    const extraData = getLocalPrayerData(lat, lng, hijriOffset, tz);

    let namaz = await Namaz.findOne({ user: req.user.id, date: todayString });

    if (!namaz) {
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
    }

    res.status(200).json({
      ...formatNamazResponse(namaz),
      ...extraData,
    });
  } catch (error) {
    console.error("Get Today Namaz Error:", error);
    res.status(500).json({ message: "Server error", detail: error.message });
  }
};

// --- MARK SINGLE PRAYER ---
export const markNamaz = async (req, res) => {
  try {
    const { date } = req.params;
    const { prayer, status } = req.body;

    const prayerMap = {
      fajr: "fajr",
      zuhr: "zuhr",
      asr: "asr",
      maghrib: "maghrib",
      isha: "isha",
    };

    const modelPrayer = prayerMap[prayer.toLowerCase()] || prayer;

    let namaz = await Namaz.findOne({ user: req.user.id, date });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date,
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
    res.status(500).json({ message: "Server error" });
  }
};

// --- MARK MULTIPLE PRAYERS ---
export const markMultiplePrayers = async (req, res) => {
  try {
    const { date } = req.params;
    const { prayers } = req.body;

    let namaz = await Namaz.findOne({ user: req.user.id, date });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date,
        prayers: {
          fajr: false,
          zuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        },
      });
    }

    Object.keys(prayers).forEach((p) => {
      if (namaz.prayers[p] !== undefined) {
        namaz.prayers[p] = prayers[p];
      }
    });

    await namaz.save();
    res
      .status(200)
      .json({ message: "Prayers updated", namaz: formatNamazResponse(namaz) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- HISTORY (Last N Days) ---
export const getNamazHistory = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startDateString = startDate.toISOString().split("T")[0];

    const history = await Namaz.find({
      user: req.user.id,
      date: { $gte: startDateString },
    }).sort({ date: -1 });

    res.status(200).json(history.map((n) => formatNamazResponse(n)));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- CRON JOB ---
export const autoSaveMissedPrayers = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const todayString = new Date().toISOString().split("T")[0];
      const users = await Namaz.distinct("user");

      for (let userId of users) {
        if (!userId) continue;
        const exists = await Namaz.findOne({ user: userId, date: todayString });
        if (!exists) {
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
      console.log("Midnight auto-create task completed.");
    } catch (err) {
      console.error("Midnight job failed:", err);
    }
  });
};

// --- RESPONSE FORMATTER HELPER ---
const formatNamazResponse = (namaz) => {
  return {
    date:
      typeof namaz.date === "string"
        ? namaz.date
        : namaz.date.toISOString().split("T")[0],
    prayers: {
      fajr: namaz.prayers.fajr,
      zuhr: namaz.prayers.zuhr,
      asr: namaz.prayers.asr,
      maghrib: namaz.prayers.maghrib,
      isha: namaz.prayers.isha,
    },
  };
};
