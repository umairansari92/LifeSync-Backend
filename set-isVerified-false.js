// set-isVerified-false.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI not found in .env. Set MONGODB_URI and retry.");
  process.exit(1);
}

const MIGRATION_KEY = "set-isVerified-false-v1";

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Migration marker collection to ensure this runs only once
    const Migration = mongoose.model(
      "Migration",
      new mongoose.Schema({ key: String, runAt: Date }, { collection: "migrations" })
    );

    const already = await Migration.findOne({ key: MIGRATION_KEY });
    if (already) {
      console.log("ℹ️ Migration already applied. Exiting.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // User model (adjust schema if your project uses different field names)
    const User = mongoose.model(
      "User",
      new mongoose.Schema({ email: String, isVerified: { type: Boolean, default: false } }, { collection: "users" })
    );

    // Count how many users currently have isVerified true
    const count = await User.countDocuments({ isVerified: true });
    console.log(`Found ${count} users with isVerified: true`);

    if (count > 0) {
      // Update all matching users to set isVerified false
      const res = await User.updateMany({ isVerified: true }, { $set: { isVerified: false } });
      console.log(`Updated ${res.modifiedCount ?? res.nModified ?? res.modified} users to isVerified: false`);
    } else {
      console.log("No users to update.");
    }

    // Insert migration marker so this script won't run again
    await Migration.create({ key: MIGRATION_KEY, runAt: new Date() });
    console.log("✅ Migration marker saved. This script will not run again.");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

main();

