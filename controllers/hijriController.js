// hijriController.js
import { Coordinates, PrayerTimes, CalculationMethod } from "adhan";

// Helper to clamp adjustment between -2 and +2
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

export const getHijriDate = async (req, res) => {
  try {
    // 1. Inputs receive karna
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const userAdjustment = clamp(parseInt(req.query.adjustment) || 0, -2, 2);

    // 2. Current UTC time
    let processingDate = new Date();

    // 3. Maghrib logic if coordinates exist
    if (!isNaN(lat) && !isNaN(lng)) {
      const coordinates = new Coordinates(lat, lng);
      const params = CalculationMethod.MuslimWorldLeague();
      const prayerTimes = new PrayerTimes(coordinates, processingDate, params);

      // Agar abhi ka waqt Maghrib se zyada hai, to Islamic date +1 day
      if (processingDate > prayerTimes.maghrib) {
        processingDate.setDate(processingDate.getDate() + 1);
      }
    }

    // 4. Apply user manual adjustment (+/- 2 days)
    if (userAdjustment !== 0) {
      processingDate.setDate(processingDate.getDate() + userAdjustment);
    }

    // 5. Format Hijri Date (fallback simple calendar to avoid ICU errors)
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const hijriString = formatter.format(processingDate);

    // 6. Response
    return res.status(200).json({
      success: true,
      data: {
        fullDate: hijriString, // e.g., "7 Rajab 1446"
      },
    });
  } catch (error) {
    console.error("Hijri Date Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export default getHijriDate;