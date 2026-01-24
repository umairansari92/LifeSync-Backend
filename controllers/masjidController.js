import Masjid from "../models/masjidModel.js";
import axios from "axios";

// --- HELPER: Haversine Distance Calculation ---
const haversineDistance = (lon1, lat1, lon2, lat2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- 1. GET NEARBY MASAJID ---
export const getNearbyMasajid = async (req, res) => {
  try {
    const { lat, lng, radius = 2, limit = 15 } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    // MongoDB geospatial query
    const masajid = await Masjid.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: radius * 1000, // Convert km to meters
        },
      },
    })
      .limit(parseInt(limit))
      .sort({ isVerified: -1, confidenceScore: -1 });

    // If results < 3 or nearest is too far, trigger Google Places fallback
    const shouldUseFallback =
      masajid.length < 3 ||
      (masajid.length > 0 &&
        haversineDistance(
          lng,
          lat,
          masajid[0].location.coordinates[0],
          masajid[0].location.coordinates[1]
        ) > 2);

    let allResults = masajid;

    if (shouldUseFallback) {
      try {
        const googlePlaces = await getGooglePlaces(lat, lng, radius);
        allResults = [...masajid, ...googlePlaces];
      } catch (err) {
        console.error("Google Places fallback error:", err.message);
      }
    }

    // Remove duplicates (within 50m with similar names)
    const uniqueResults = removeDuplicates(allResults);

    res.status(200).json({
      success: true,
      count: uniqueResults.length,
      masajid: uniqueResults.slice(0, limit),
    });
  } catch (error) {
    console.error("Get nearby masajid error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- 2. GET MASJID DETAILS WITH TIMINGS ---
export const getMasjidDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const masjid = await Masjid.findById(id).populate(
      "contributors.userId",
      "name email"
    );

    if (!masjid) {
      return res.status(404).json({ message: "Masjid not found" });
    }

    res.status(200).json({ success: true, masjid });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- 3. UPDATE MASJID TIMING ---
export const updateMasjidTiming = async (req, res) => {
  try {
    const { id } = req.params;
    const { prayer, time } = req.body;
    const userId = req.user.id;

    if (!["fajr", "zuhr", "asr", "maghrib", "isha", "jummah"].includes(prayer)) {
      return res.status(400).json({ message: "Invalid prayer name" });
    }

    let masjid = await Masjid.findById(id);
    if (!masjid) {
      return res.status(404).json({ message: "Masjid not found" });
    }

    // Update timing
    masjid.jamaatTimings[prayer] = time;

    // Add to history
    masjid.timingsHistory.push({
      prayer,
      time,
      submittedBy: userId,
      submittedAt: new Date(),
      verified: false,
    });

    // Update contributor
    const existingContributor = masjid.contributors.find(
      (c) => c.userId.toString() === userId
    );
    if (existingContributor) {
      existingContributor.contributions += 1;
      existingContributor.lastContributedAt = new Date();
    } else {
      masjid.contributors.push({
        userId,
        level: "Helper",
        contributions: 1,
        lastContributedAt: new Date(),
      });
    }

    masjid.contributorCount = masjid.contributors.length;
    masjid.lastUpdatedBy = userId;
    masjid.lastUpdatedAt = new Date();

    await masjid.save();

    // Check for verification
    await verifyTiming(id, prayer);

    res.status(200).json({
      success: true,
      message: "Timing updated successfully",
      masjid,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- 4. VERIFY TIMING ---
const verifyTiming = async (masjidId, prayer) => {
  try {
    const masjid = await Masjid.findById(masjidId);

    // Get last 30 days of same prayer submissions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const submissions = masjid.timingsHistory.filter(
      (h) =>
        h.prayer === prayer &&
        h.submittedAt >= thirtyDaysAgo &&
        h.verified === false
    );

    // Group by time
    const timeGroups = {};
    submissions.forEach((sub) => {
      if (!timeGroups[sub.time]) {
        timeGroups[sub.time] = [];
      }
      timeGroups[sub.time].push(sub.submittedBy);
    });

    // Check if any time has 3+ unique contributors
    for (const [time, contributors] of Object.entries(timeGroups)) {
      if (contributors.length >= 3) {
        masjid.jamaatTimings[prayer] = time;
        
        // Mark as verified
        if (!masjid.verificationStatus[prayer]) {
          masjid.verificationStatus[prayer] = {
            verified: true,
            verifiedBy: [...new Set(contributors)],
          };
        } else {
          masjid.verificationStatus[prayer].verified = true;
          masjid.verificationStatus[prayer].verifiedBy = [
            ...new Set(contributors),
          ];
        }

        // Update confidence score
        updateConfidenceScore(masjid);
        break;
      }
    }

    // If all prayers verified, mark masjid as verified
    const allVerified = Object.values(masjid.verificationStatus).every(
      (v) => v && v.verified
    );
    if (allVerified) {
      masjid.isVerified = true;
    }

    await masjid.save();
  } catch (err) {
    console.error("Verification error:", err);
  }
};

// --- 5. UPDATE CONFIDENCE SCORE ---
const updateConfidenceScore = (masjid) => {
  let score = 0;

  // Verified prayers (20 points each)
  const verifiedCount = Object.values(masjid.verificationStatus).filter(
    (v) => v && v.verified
  ).length;
  score += verifiedCount * 20;

  // Contributors (10 points per contributor)
  score += Math.min(masjid.contributorCount * 10, 50);

  // Rating (20 points max)
  score += Math.min((masjid.averageRating / 5) * 20, 20);

  masjid.confidenceScore = Math.min(score, 100);
};

// --- 6. CREATE/ADD NEW MASJID ---
export const createMasjid = async (req, res) => {
  try {
    const { name, address, lat, lng, phone, email, website } = req.body;
    const userId = req.user.id;

    // Check for duplicates
    const existing = await Masjid.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: 50, // 50 meters
        },
      },
      name: { $regex: new RegExp(name, "i") },
    });

    if (existing) {
      return res.status(400).json({
        message: "Masjid already exists in database",
        masjidId: existing._id,
      });
    }

    const newMasjid = new Masjid({
      name,
      address,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      phone,
      email,
      website,
      source: "community",
      contributors: [
        {
          userId,
          level: "Helper",
          contributions: 1,
          lastContributedAt: new Date(),
        },
      ],
      lastUpdatedBy: userId,
    });

    await newMasjid.save();

    res.status(201).json({
      success: true,
      message: "Masjid added successfully",
      masjid: newMasjid,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- 7. RATE MASJID ---
export const rateMasjid = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating < 0 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 0 and 5" });
    }

    const masjid = await Masjid.findById(id);
    if (!masjid) {
      return res.status(404).json({ message: "Masjid not found" });
    }

    masjid.averageRating =
      (masjid.averageRating * masjid.totalRatings + rating) /
      (masjid.totalRatings + 1);
    masjid.totalRatings += 1;

    updateConfidenceScore(masjid);
    await masjid.save();

    res.status(200).json({
      success: true,
      message: "Rating added successfully",
      averageRating: masjid.averageRating,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- HELPER: Remove Duplicates ---
const removeDuplicates = (masajid) => {
  const seen = new Map();
  const unique = [];

  masajid.forEach((masjid) => {
    const key = `${Math.round(masjid.location.coordinates[0] * 1000)},${Math.round(
      masjid.location.coordinates[1] * 1000
    )}`;

    if (!seen.has(key)) {
      seen.set(key, true);
      unique.push(masjid);
    }
  });

  return unique;
};

// --- HELPER: Google Places Fallback ---
const getGooglePlaces = async (lat, lng, radius) => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return [];

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location: `${lat},${lng}`,
          radius: radius * 1000,
          keyword: "mosque OR masjid",
          key: apiKey,
        },
      }
    );

    if (!response.data.results) return [];

    // Convert Google results to our format
    return response.data.results.map((place) => ({
      _id: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: {
        type: "Point",
        coordinates: [
          place.geometry.location.lng,
          place.geometry.location.lat,
        ],
      },
      jamaatTimings: {},
      isVerified: false,
      confidenceScore: 40, // Lower score for unverified Google data
      source: "google",
      googlePlacesId: place.place_id,
    }));
  } catch (error) {
    console.error("Google Places API error:", error.message);
    return [];
  }
};

// --- GET LEADERBOARD ---
export const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Masjid.aggregate([
      { $unwind: "$contributors" },
      {
        $group: {
          _id: "$contributors.userId",
          totalContributions: { $sum: "$contributors.contributions" },
          masjidsContributed: { $sum: 1 },
          level: { $first: "$contributors.level" },
        },
      },
      { $sort: { totalContributions: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
    ]);

    res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
