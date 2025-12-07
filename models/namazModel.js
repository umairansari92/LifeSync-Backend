// namazModel.js - Corrected and Extended

import mongoose from "mongoose";

const namazSchema = mongoose.Schema(
  {
    // 1. User Reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // 2. Date Fix: Date ko 'String' se badal kar 'Date' type kar dein.

    // Ye Mongoose queries aur comparison ke liye zaroori hai.
    date: {
      type: Date, // 👈 CHANGE: Use Date type
      required: true,
      index: true, // Search ko tez karne ke liye
    }, // 3. Prayers Status (Tracking)

    prayers: {
      fajr: { type: Boolean, default: false },
      zuhr: { type: Boolean, default: false },
      asr: { type: Boolean, default: false },
      maghrib: { type: Boolean, default: false },
      isha: { type: Boolean, default: false },
    },

    // 4. Timings Storage (Al Adhan API se aane wala data)
    // Jab aapko timings store karni hain toh yeh fields lazmi hain.
    fajrTime: { type: String, default: null },
    sunriseTime: { type: String, default: null },
    dhuhrTime: { type: String, default: null }, // 👈 API Dhuhr deta hai
    asrTime: { type: String, default: null },
    maghribTime: { type: String, default: null },
    ishaTime: { type: String, default: null },

    // Auto-save check ke liye
    autoSaved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Har user ke liye har date ka sirf ek hi record hona chahiye
namazSchema.index({ user: 1, date: 1 }, { unique: true });

export const Namaz = mongoose.model("Namaz", namazSchema);
export default Namaz;
