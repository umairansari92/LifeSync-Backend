import mongoose from "mongoose";

const quranReadingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ["surah", "complete"], required: true },
  name: { type: String, required: true }, // Surah name or "Complete Quran"
  count: { type: Number, default: 0 },
  month: { type: String }, // YYYY-MM
  year: { type: Number }, // YYYY
}, { timestamps: true });

// Pre-save hook to auto set month and year
quranReadingSchema.pre("save", function (next) {
  const d = new Date(this.date);
  this.month = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  this.year = d.getFullYear();
  next();
});

const QuranReading = mongoose.model("QuranReading", quranReadingSchema);

export default QuranReading;
