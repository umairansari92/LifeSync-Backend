import bcrypt from "bcrypt";
import User from "../models/user.js";
// import Otp from "../models/otp.js"; // kept for future but unused
// import { sendEmail } from "../utils/sendEmail.js";
// import { generateOtp } from "../utils/generateOtp.js";
import { signAccessToken } from "../utils/jwtUtils.js";
import cloudinary from "../config/cloudinary.js";
// import { sendOtpEmail } from "../utils/sendgrid.js";

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

    if (!req.file) {
      return res.status(400).json({
        message: "Profile image is required",
      });
    }

    // Cloudinary upload using buffer
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "lifesync_users" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      phone,
      dob,
      profileImage: uploadResult.secure_url,
      isVerified: true, // Direct verify
    });

    return res.status(201).json({
      message: "User registered successfully.",
      success: true,
      email: user.email,
    });

  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `This ${field} is already registered. Please use a different ${field}.`,
        success: false,
        error: "DUPLICATE_KEY",
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
// LOGIN USER (NO VERIFICATION REQUIRED)
// ===========================

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid Email or Password" });

    // NO EMAIL VERIFICATION CHECK NOW
    /*
    if (!user.isVerified)
      return res.status(403).json({ message: "Please verify your email first" });
    */

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Email or Password" });

    const token = signAccessToken({ id: user._id, email: user.email });

    if (process.env.NODE_ENV === "production") {
      res.cookie("ls_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

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
// FORGOT PASSWORD (OTP DISABLED)
// ===========================

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // OTP DISABLED
    /*
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode, expiresAt });

    await sendEmail(email, "Reset Password OTP", `Your OTP is ${otpCode}`);
    */

    return res.status(200).json({
      message: "OTP system disabled. Please update password directly.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===========================
// VERIFY RESET OTP (DISABLED)
// ===========================

export const verifyResetOtp = async (req, res) => {
  return res.status(200).json({
    message: "OTP verification disabled temporarily.",
  });
};

// ===========================
// RESET PASSWORD DIRECTLY
// ===========================

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===========================
// EMAIL UPDATE OTP DISABLED
// ===========================

export const requestEmailUpdateOtp = async (req, res) => {
  return res.status(200).json({
    message: "Email update OTP disabled.",
  });
};

export const updateEmail = async (req, res) => {
  return res.status(200).json({
    message: "Direct email update disabled until OTP re enabled.",
  });
};
