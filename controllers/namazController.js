import Namaz from "../models/namazModel.js";
import cron from "node-cron";
import fetch from "node-fetch"; // 👈 API call ke liye 'node-fetch' ya 'axios' install karein

// --- Helper Functions ---

// Helper function to format the database response for the frontend
const formatNamazResponse = (namaz) => {
  // Ensure date is formatted as YYYY-MM-DD string
  const date = namaz.date.toISOString().split("T")[0];

  return {
    date,
    id: namaz._id,
    prayers: {
      fajr: namaz.prayers.fajr,
      zuhr: namaz.prayers.zuhr, // Dhuhr ko Zuhr hi rakhte hain frontend consistency ke liye
      asr: namaz.prayers.asr,
      maghrib: namaz.prayers.maghrib,
      isha: namaz.prayers.isha,
    },
    timings: {
      fajr: namaz.fajrTime,
      sunrise: namaz.sunriseTime,
      zuhr: namaz.dhuhrTime, // Database mein dhuhrTime se value aa rahi hai
      asr: namaz.asrTime,
      maghrib: namaz.maghribTime,
      isha: namaz.ishaTime,
    },
  };
};

// --- Controller Logic ---

// Get today's Namaz status and timings
export const getTodayNamaz = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let namaz = await Namaz.findOne({
      user: req.user.id,
      date: today,
    });

    if (!namaz) {
      // If no record exists for today, create a default one
      namaz = await Namaz.create({
        user: req.user.id,
        date: today,
        prayers: {
          fajr: false,
          zuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        },
      });
    } // Agar timings available nahi hain, toh fetch karne ki koshish karein

    if (!namaz.dhuhrTime) {
      // Yahan hum ek helper function ko call kar sakte hain.
      // Lekin agar aapko latency nahi chahiye toh timings ko pehle hi cron job se fetch kar len.
      console.log(
        `Timings not available for user ${req.user.id}. Skipping auto-fetch here.`
      );
    }

    res.status(200).json(formatNamazResponse(namaz));
  } catch (error) {
    console.error("Error in getTodayNamaz:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark a prayer as offered/missed
export const markNamaz = async (req, res) => {
  try {
    const { date } = req.params; // YYYY-MM-DD
    const { prayer, status } = req.body;

    const prayerMap = {
      fajr: "fajr",
      zuhr: "zuhr",
      asr: "asr",
      maghrib: "maghrib",
      isha: "isha",
    };
    const modelPrayer = prayerMap[prayer] || prayer; // Date string ko Date Object mein convert karein for Mongoose query

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    let namaz = await Namaz.findOne({ user: req.user.id, date: queryDate });

    if (!namaz) {
      namaz = await Namaz.create({
        user: req.user.id,
        date: queryDate,
        prayers: {
          fajr: false,
          zuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        },
      });
    } // Ensure the key exists before setting

    if (namaz.prayers.hasOwnProperty(modelPrayer)) {
      namaz.prayers[modelPrayer] = status;
      await namaz.save();
    } else {
      return res.status(400).json({ message: "Invalid prayer name" });
    }

    res.status(200).json({
      message: `${prayer} marked as ${status ? "offered" : "missed"}`,
      namaz: formatNamazResponse(namaz),
    });
  } catch (error) {
    console.error("Error in markNamaz:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get history for last N days
export const getNamazHistory = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const history = await Namaz.find({
      user: req.user.id,
      date: { $gte: startDate },
    }).sort({ date: 1 }); // ASCENDING order for history display

    const formattedHistory = history.map((namaz) => formatNamazResponse(namaz));

    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error("Error in getNamazHistory:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Timings & Cron Jobs ---

/**
 * 🌙 Al Adhan API se timings fetch karke database mein save karta hai.
 * NOTE: Is function ko cron job ya server start hone par call karna chahiye.
 * Yeh user ki profile se location (lat/lng/method) leta hai.
 */
export const fetchAndSaveTimings = async (user, date) => {
  // ⚠️ IMPORTANT: Aapko user model se latitude, longitude, aur calculation method nikalna hoga.
  // For demo, main hardcode kar raha hun:
  const latitude = 31.5204;
  const longitude = 74.3587;
  const method = 2; // 2 = ISNA (MoonsightingCommittee = 9)

  const dateString = date.toISOString().split("T")[0];
  const apiUrl = `http://api.aladhan.com/v1/timings/${dateString}?latitude=${latitude}&longitude=${longitude}&method=${method}`;

  try {
    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    if (data.code === 200 && data.data) {
      const timings = data.data.timings;

      // Update ya create the Namaz record with timings
      await Namaz.findOneAndUpdate(
        { user: user._id || user, date: date },
        {
          $set: {
            fajrTime: timings.Fajr.split(" ")[0],
            sunriseTime: timings.Sunrise.split(" ")[0],
            dhuhrTime: timings.Dhuhr.split(" ")[0], // 👈 Timings save ho gaye!
            asrTime: timings.Asr.split(" ")[0],
            maghribTime: timings.Maghrib.split(" ")[0],
            ishaTime: timings.Isha.split(" ")[0],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(
        `Timings fetched and saved for user ${
          user._id || user
        } on ${dateString}`
      );
    } else {
      console.error("API Response Failed:", data.data);
    }
  } catch (error) {
    console.error("API Fetch Error:", error.message);
  }
};

/**
 * ⏰ CRON JOB: Har raat 12:05 baje, aaj aur kal ki timings fetch karein
 * Agar aapka server user ki location store karta hai toh usko User model se nikal kar loop karein.
 */
export const scheduleTimingsUpdate = (userModel) => {
  cron.schedule("5 0 * * *", async () => {
    // 00:05 AM ko run hoga
    try {
      console.log("Running scheduled timing update job..."); // Aaj aur Kal ki dates

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1); // Agar aapke paas User Model hai toh sab users ko nikaal kar loop karein // Agar userModel available hai toh: // const users = await userModel.find({}); // for (let user of users) { //   await fetchAndSaveTimings(user, today); //   await fetchAndSaveTimings(user, tomorrow); // } // Filhal, sirf un users ki IDs nikaal lete hain jinhon ne Namaz track ki hai

      const distinctUserIds = await Namaz.distinct("user");

      for (let userId of distinctUserIds) {
        // Kal aur Aaj ki timings save karein (agar nahi hain)
        await fetchAndSaveTimings(userId, today);
      }

      console.log("Timing update job finished.");
    } catch (err) {
      console.error("Timing update job failed:", err);
    }
  });
};

/**
 * 🌙 CRON JOB: Pichle din ki Namazon ko auto-missed mark karta hai
 * (Yeh woh masla hai jo aapne bataya tha)
 */
export const autoSaveMissedPrayers = (userModel) => {
  cron.schedule("1 0 * * *", async () => {
    // 00:01 AM ko run hoga
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0); // Saare users ki IDs nikal lein jinhon ne Namaz track ki hai

      const distinctUserIds = await Namaz.distinct("user");
      console.log(
        `Running autosave job for ${distinctUserIds.length} users...`
      );

      for (let userId of distinctUserIds) {
        // Check if yesterday's entry exists for THIS user
        let yesterdayNamaz = await Namaz.findOne({
          user: userId,
          date: yesterday,
        });

        if (!yesterdayNamaz) {
          // Create a new entry with all prayers marked as false (missed)
          await Namaz.create({
            user: userId,
            date: yesterday,
            prayers: {
              fajr: false,
              zuhr: false,
              asr: false,
              maghrib: false,
              isha: false,
            },
            autoSaved: true,
          });
          console.log(`Auto-saved yesterday's prayers for user: ${userId}`);
        }
      }
      console.log("Autosave job finished.");
    } catch (err) {
      console.error("Midnight autosave job failed:", err);
    }
  });
};
