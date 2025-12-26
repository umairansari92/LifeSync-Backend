import { Coordinates, PrayerTimes, CalculationMethod } from "adhan";

// Helper: Adjustment ko -2 aur +2 ke darmiyan lock karne ke liye
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

export const getHijriDate = async (req, res) => {
  try {
    // 1. Inputs Receive Karna
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const userAdjustment = clamp(parseInt(req.query.adjustment) || 0, -2, 2);

    // 2. Current Time (UTC recommended for backend consistency)
    let processingDate = new Date();

    // 3. Maghrib Logic (Agar coordinates hain)
    if (!isNaN(lat) && !isNaN(lng)) {
      const coordinates = new Coordinates(lat, lng);
      const params = CalculationMethod.MuslimWorldLeague();
      const prayerTimes = new PrayerTimes(coordinates, processingDate, params);

      if (processingDate > prayerTimes.maghrib) {
        processingDate.setDate(processingDate.getDate() + 1);
      }
    }

    // 4. User Manual Adjustment Apply Karna (+/- 2 days)
    if (userAdjustment !== 0) {
      processingDate.setDate(processingDate.getDate() + userAdjustment);
    }

    // 5. Formatting
    const formatter = new Intl.DateTimeFormat(
      "en-u-ca-islamic-ummalqura-nu-latn",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

    const hijriString = formatter.format(processingDate);
    const parts = formatter.formatToParts(processingDate);
    const day = parts.find((p) => p.type === "day")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const year = parts.find((p) => p.type === "year")?.value;

    // 6. Response
    return res.status(200).json({
      success: true,
      data: {
        fullDate: hijriString,
        day,
        month,
        year,
        meta: {
          adjustmentApplied: userAdjustment,
          isAfterMaghrib: !isNaN(lat)
            ? new Date() >
              new PrayerTimes(
                new Coordinates(lat, lng),
                new Date(),
                CalculationMethod.MuslimWorldLeague()
              ).maghrib
            : false,
        },
      },
    });
  } catch (error) {
    console.error("Hijri Date Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
