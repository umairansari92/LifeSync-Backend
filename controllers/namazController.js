import Namaz from "../models/namazModel.js";

// Mark a prayer as offered/missed
export const markNamaz = async (req, res) => {
  try {
    const { date } = req.params; // YYYY-MM-DD
    const { prayer, status } = req.body;

    // Convert frontend prayer names to model names
    const prayerMap = {
      fajr: 'Fajr',
      zuhr: 'Dhuhr', 
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha'
    };
    
    const modelPrayer = prayerMap[prayer] || prayer;

    // Convert string date to Date object for query
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    let namaz = await Namaz.findOne({ 
      user: req.user.id, 
      date: queryDate 
    });

    if (!namaz) {
      namaz = await Namaz.create({ 
        user: req.user.id, 
        date: queryDate,
        prayers: {
          Fajr: false,
          Dhuhr: false,
          Asr: false,
          Maghrib: false,
          Isha: false
        }
      });
    }

    namaz.prayers[modelPrayer] = status;
    await namaz.save();

    res.status(200).json({ 
      message: `${prayer} marked as ${status ? "offered" : "missed"}`, 
      namaz: formatNamazResponse(namaz)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get today's Namaz
export const getTodayNamaz = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const namaz = await Namaz.findOne({ 
      user: req.user.id, 
      date: today 
    });

    if (namaz) {
      res.status(200).json(formatNamazResponse(namaz));
    } else {
      // Return with frontend-friendly prayer names
      res.status(200).json({ 
        date: today.toISOString().split("T")[0],
        prayers: {
          fajr: false,
          zuhr: false, 
          asr: false,
          maghrib: false,
          isha: false
        }
      });
    }
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
    startDate.setHours(0, 0, 0, 0);

    const history = await Namaz.find({
      user: req.user.id,
      date: { $gte: startDate }
    }).sort({ date: -1 });

    // Format response for frontend
    const formattedHistory = history.map(namaz => formatNamazResponse(namaz));
    
    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to convert model names to frontend names
const formatNamazResponse = (namaz) => {
  return {
    date: namaz.date.toISOString().split("T")[0],
    prayers: {
      fajr: namaz.prayers.Fajr,
      zuhr: namaz.prayers.Dhuhr,
      asr: namaz.prayers.Asr,
      maghrib: namaz.prayers.Maghrib,
      isha: namaz.prayers.Isha
    }
  };
};