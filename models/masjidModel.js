import mongoose from "mongoose";

const masjidSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },

    // Geolocation (2dsphere index for nearby search)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    // Jamaat Timings
    jamaatTimings: {
      fajr: String,
      zuhr: String,
      asr: String,
      maghrib: String,
      isha: String,
      jummah: String,
    },

    // Verification & Trust
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationStatus: {
      fajr: { verified: Boolean, verifiedBy: [mongoose.Schema.Types.ObjectId] },
      zuhr: { verified: Boolean, verifiedBy: [mongoose.Schema.Types.ObjectId] },
      asr: { verified: Boolean, verifiedBy: [mongoose.Schema.Types.ObjectId] },
      maghrib: { verified: Boolean, verifiedBy: [mongoose.Schema.Types.ObjectId] },
      isha: { verified: Boolean, verifiedBy: [mongoose.Schema.Types.ObjectId] },
    },
    confidenceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Community Contribution
    contributorCount: {
      type: Number,
      default: 1,
    },
    contributors: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        level: {
          type: String,
          enum: ["Helper", "Supporter", "Guardian"],
          default: "Helper",
        },
        contributions: Number,
        lastContributedAt: Date,
      },
    ],

    // Timings History (for verification audit trail)
    timingsHistory: [
      {
        prayer: {
          type: String,
          enum: ["fajr", "zuhr", "asr", "maghrib", "isha", "jummah"],
        },
        time: String,
        submittedBy: mongoose.Schema.Types.ObjectId,
        submittedAt: {
          type: Date,
          default: Date.now,
        },
        verified: Boolean,
      },
    ],

    // Source Tracking
    source: {
      type: String,
      enum: ["community", "google"],
      default: "community",
    },
    googlePlacesId: String,

    // Additional Info
    phone: String,
    email: String,
    website: String,
    facilities: [String], // ablution, parking, etc.

    // Last Updated
    lastUpdatedBy: mongoose.Schema.Types.ObjectId,
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },

    // Ratings
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Create 2dsphere index for geospatial queries
masjidSchema.index({ location: "2dsphere" });
masjidSchema.index({ name: "text", address: "text" });

export default mongoose.model("Masjid", masjidSchema);
