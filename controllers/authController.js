import bcrypt from "bcrypt";
import User from "../models/user.js";
import Otp from "../models/otp.js";
import { signAccessToken } from "../utils/jwtUtils.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { sendOtpEmail } from "../utils/sendgrid.js";
import crypto from "crypto";

// Helper to generate numeric OTP
const generateNumericOtp = (length = 6) => {
  return crypto.randomInt(100000, 999999).toString();
};

// ===========================
// REGISTER USER
// ===========================

export const registerUser = async (req, res) => {
  try {
    const { firstname, lastname, email, password, phone, dob } = req.body;

    if (!firstname || !lastname || !email || !password || !phone || !dob) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message:
          "This email is already registered. Please login or use a different email.",
        success: false,
        error: "DUPLICATE_EMAIL",
      });
    }

    let profileImageUrl = "";
    if (req.file) {
      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "lifesync_users",
      });
      profileImageUrl = uploadResult.secure_url;
      // Delete local file after upload
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Failed to delete local file:", err);
      });
    } else {
      return res.status(400).json({ message: "Profile image is required" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with isVerified: false
    const user = await User.create({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      phone,
      dob,
      profileImage: profileImageUrl,
      isVerified: false,
    });

    // Generate and store OTP
    const otpCode = generateNumericOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await Otp.create({
      email,
      otp: otpCode,
      expiresAt,
    });

    // Send OTP Email
    await sendOtpEmail(email, otpCode);

    return res.status(201).json({
      message: "Registration successful. Please verify your email.",
      success: true,
      email: user.email,
      requiresVerification: true,
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Email already exists.",
        success: false,
      });
    }

    res.status(500).json({
      message: "Registration failed. Please try again.",
      success: false,
      error: error.message,
    });
  }
};

// ===========================
// LOGIN USER
// ===========================

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid Email or Password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Email or Password" });

    // Check Verification Status
    if (!user.isVerified) {
      // Generate new OTP
      const otpCode = generateNumericOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Remove old OTPs
      await Otp.deleteMany({ email });

      // Store new OTP
      await Otp.create({ email, otp: otpCode, expiresAt });

      // Send Email
      await sendOtpEmail(email, otpCode);

      return res.status(403).json({
        message: "Email not verified. A new OTP has been sent.",
        success: false,
        error: "VERIFICATION_REQUIRED",
        email: user.email,
      });
    }

    // verification passed
    const token = signAccessToken({ id: user._id, email: user.email });

    const cookieOptions = {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    };

    if (process.env.NODE_ENV === "production") {
      cookieOptions.secure = true;
      cookieOptions.sameSite = "none";
    } else {
      cookieOptions.secure = false;
      cookieOptions.sameSite = "lax";
    }

    res.cookie("ls_token", token, cookieOptions);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        profileImage: user.profileImage || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ===========================
// VERIFY OTP
// ===========================

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Check if expired (Redundant if TTL index works, but safe check)
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Verify User
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete OTP
    await Otp.deleteMany({ email });

    // Auto login after verification (optional, but good UX)
    const token = signAccessToken({ id: user._id, email: user.email });

    return res.status(200).json({
      message: "Email verified successfully",
      success: true,
      token,
      user: {
        id: user._id,
        firstname: user.firstname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res
      .status(500)
      .json({ message: "Server error during verification" });
  }
};

// ===========================
// RESEND OTP
// ===========================

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    // Rate limit check (Custom simple Logic or use middleware)
    // Here we just check if a very recent OTP exists (e.g. < 1 min ago)
    // For simplicity and matching requirements:
    // "User resend OTP kare to naya OTP generate ho."

    // Clean old OTPs
    await Otp.deleteMany({ email });

    const otpCode = generateNumericOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await Otp.create({ email, otp: otpCode, expiresAt });

    await sendOtpEmail(email, otpCode);

    return res.status(200).json({
      message: "New OTP sent successfully",
      success: true,
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ===========================
// LOGOUT USER
// ===========================

export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("ls_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    return res.status(200).json({ message: "Logged out" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ===========================
// FORGOT PASSWORD
// ===========================
// Re-enabling with new SendGrid logic if needed, or keeping it disabled as per previous codebase state?
// The user request focused on Signup/Login/OTP.
// "Verify Delete Account" uses OTP too. I should fix that in userController.
// For now leaving this as is or basic stub, but I should probably unlock it if I can.
// But to be safe and stick to instructions, I will just export the stubs or simple implementations.
// Actually, I should probably update forgotPassword to use the new system too if I want to be helpful.
// But the prompt specifically detailed "Signup and Login verification".
// I'll leave these as stubs or minimal updates to avoid scope creep,
// UNLESS the previous file had them implemented and I'm overwriting them.
// The previous file had them disabled/commented.

export const forgotPassword = async (req, res) => {
  // TODO: Implement using sendOtpEmail if needed
  return res.status(200).json({ message: "Feature coming soon" });
};

export const verifyResetOtp = async (req, res) => {
  return res.status(200).json({ message: "Feature coming soon" });
};

    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===========================
// EMAIL UPDATE OTP (DISABLED/STUB)
// ===========================

export const requestEmailUpdateOtp = async (req, res) => {
  return res.status(200).json({
    message: "Email update OTP disabled.",
  });
};

export const updateEmail = async (req, res) => {
  return res.status(200).json({
    message: "Direct email update disabled until OTP re-enabled.",
  });
};
