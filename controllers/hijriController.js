const { Coordinates, PrayerTimes, CalculationMethod } = require("adhan");


// Helper: Adjustment ko -2 aur +2 ke darmiyan lock karne ke liye
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const getHijriDate = async (req, res) => {
    try {
        // 1. Inputs Receive Karna
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        // Default 0, aur clamp function se ensure karein ke value -2 se +2 ke beech ho
        const userAdjustment = clamp(parseInt(req.query.adjustment) || 0, -2, 2);

        // 2. Current Time (UTC recommended for backend consistency)
        let processingDate = new Date();

        // 3. Maghrib Logic (Agar coordinates hain)
        // Islamic date Maghrib (Sunset) ke baad change hoti hai
        if (!isNaN(lat) && !isNaN(lng)) {
            const coordinates = new Coordinates(lat, lng);
            // MuslimWorldLeague ek safe standard hai, aap chahain to region ke hisaab se change kar lein
            const params = CalculationMethod.MuslimWorldLeague();
            
            const prayerTimes = new PrayerTimes(coordinates, processingDate, params);

            // Agar abhi ka waqt Maghrib se zyada hai, to Islamic Date ke liye +1 din add karein
            if (processingDate > prayerTimes.maghrib) {
                processingDate.setDate(processingDate.getDate() + 1);
            }
        }

        // 4. User Manual Adjustment Apply Karna (+/- 2 days)
        if (userAdjustment !== 0) {
            processingDate.setDate(processingDate.getDate() + userAdjustment);
        }

        // 5. Formatting (Latest Intl API - No Moment.js needed)
        // 'en-u-nu-latn' ensure karta hai ke digits English (1,2,3) hon, Arabic (١,٢,٣) na hon
        const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-ummalqura-nu-latn', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const hijriString = formatter.format(processingDate);

        // Optional: Alag alag parts nikalna agar frontend pe styling karni ho
        const parts = formatter.formatToParts(processingDate);
        const day = parts.find(p => p.type === 'day').value;
        const month = parts.find(p => p.type === 'month').value;
        const year = parts.find(p => p.type === 'year').value;

        // 6. Response
        return res.status(200).json({
            success: true,
            data: {
                fullDate: hijriString, // e.g., "7 Rajab 1446"
                day,
                month,
                year,
                meta: {
                    adjustmentApplied: userAdjustment,
                    isAfterMaghrib: !isNaN(lat) ? (new Date() > prayerTimes.maghrib) : false
                }
            }
        });

    } catch (error) {
        console.error("Hijri Date Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error" 
        });
    }
};

export default getHijriDate;