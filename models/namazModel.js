// namazModel.js - Change to lowercase and consistent names
import mongoose from "mongoose";

const namazSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Change to String "YYYY-MM-DD"
    prayers: {
      fajr: { type: Boolean, default: false },
      zuhr: { type: Boolean, default: false },
      asr: { type: Boolean, default: false },
      maghrib: { type: Boolean, default: false },
      isha: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Namaz = mongoose.model("Namaz", namazSchema);
export default Namaz;