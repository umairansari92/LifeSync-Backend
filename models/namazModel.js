import mongoose from "mongoose";

const namazSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    prayers: {
      Fajr: { type: Boolean, default: false },
      Dhuhr: { type: Boolean, default: false },
      Asr: { type: Boolean, default: false },
      Maghrib: { type: Boolean, default: false },
      Isha: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const Namaz = mongoose.model("Namaz", namazSchema);

export default Namaz;
