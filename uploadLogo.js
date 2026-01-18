import cloudinary from "./config/cloudinary.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadLogo = async () => {
  try {
    const logoPath = path.join(__dirname, "tests", "logo.png");
    console.log("Uploading logo from:", logoPath);

    const result = await cloudinary.uploader.upload(logoPath, {
      folder: "lifesync_assets",
      public_id: "lifesync_logo_email",
      overwrite: true,
    });

    console.log("✅ Logo uploaded successfully!");
    console.log("URL:", result.secure_url);
  } catch (error) {
    console.error("❌ Upload failed:", error);
  }
};

uploadLogo();
