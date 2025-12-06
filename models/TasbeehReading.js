import mongoose from "mongoose";

const tasbeehReadingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  name: { type: String, required: true }, // Tasbeeh name
  count: { type: Number, default: 0 },
  month: { type: String }, // YYYY-MM
  year: { type: Number }, // YYYY
}, { timestamps: true });

// Auto-set month and year before save
tasbeehReadingSchema.pre("save", function (next) {
  const d = new Date(this.date);
  this.month = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  this.year = d.getFullYear();
  next();
});

const TasbeehReading = mongoose.model("TasbeehReading", tasbeehReadingSchema);

export default TasbeehReading;
