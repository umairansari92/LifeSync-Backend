import { Coordinates } from "adhan";

// Helper: Adjustment ko -2 aur +2 ke darmiyan lock karne ke liye
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

export const getHijriDate = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const adjustment = clamp(parseInt(req.query.adjustment) || 0, -2, 2);

    let hijriDate = new Date();

    // Agar coordinates valid hain, to user location consider karen
    if (!isNaN(lat) && !isNaN(lng)) {
      new Coordinates(lat, lng); // sirf validate karne ke liye
    }

    // User adjustment apply karein
    if (adjustment !== 0) {
      hijriDate.setDate(hijriDate.getDate() + adjustment);
    }

    const formatter = new Intl.DateTimeFormat(
      "en-u-ca-islamic-ummalqura-nu-latn",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

    const fullDate = formatter.format(hijriDate);

    return res.status(200).json({
      success: true,
      data: {
        fullDate,
      },
    });
  } catch (error) {
    console.error({
        message: "Error fetching Hijri date"+error.message,
        error: error.message,
        status:false
    });
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
