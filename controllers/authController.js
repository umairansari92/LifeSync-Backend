import bcrypt from "bcrypt";
import User from "../models/user.js";
import Otp from "../models/otp.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateOtp } from "../utils/generateOtp.js";
import { signAccessToken } from "../utils/jwtUtils.js";
import cloudinary from "../config/cloudinary.js";
import { sendOtpEmail } from "../utils/sendgrid.js";

// Register User
// controllers/authController.js




export const registerUser = async (req, res) => {
  try {
    const { firstname, lastname, email, password, phone, dob } = req.body;

    if (!firstname || !lastname || !email || !password || !phone || !dob) {
      return res.status(400).json({ message: "All fields are required", success: false });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "This email is already registered. Please login or use a different email.",
        success: false,
        error: "DUPLICATE_EMAIL",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Profile image is required" });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "lifesync_users",
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
    });

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({ email, otp: otpCode, expiresAt });

    try {
      await sendOtpEmail(email, firstname, otpCode);
    } catch (err) {
      console.error("❌ Failed to send OTP email:", err.message);
      await User.deleteOne({ email });
      await Otp.deleteMany({ email });
      return res.status(500).json({
        message: "Registration failed. Could not send OTP email.",
        success: false,
        error: err.message,
      });
    }

    res.status(201).json({
      message: "User registered successfully. OTP sent to your email.",
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


// Login

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid Email or Password" });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Email or Password" });

    // create token
    const token = signAccessToken({ id: user._id, email: user.email });

    // cookie optional, mobile friendly
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
      token, // frontend me localStorage me store karenge
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

// Logout
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

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode, expiresAt });

    const emailMessage = `
      <h3>Password Reset Request</h3>
      <p>Your OTP to reset password is <b>${otpCode}</b></p>
      <p>Valid for 10 minutes</p>
    `;

    await sendEmail(email, "Reset Password OTP", emailMessage);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP for reset password
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email, otp });
    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    res.status(200).json({ message: "OTP verified" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const record = await Otp.findOne({ email, otp });
    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    await Otp.deleteMany({ email });

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request OTP for updating email
export const requestEmailUpdateOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.user.id;

    const existing = await User.findOne({ email: newEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email: newEmail });
    await Otp.create({ email: newEmail, otp: otpCode, expiresAt });

    const message = `
      <h3>Verify New Email</h3>
      <p>Your OTP is <b>${otpCode}</b></p>
      <p>Valid for 10 minutes</p>
    `;

    await sendEmail(newEmail, "Verify Your New Email", message);

    res.status(200).json({ message: "OTP sent to new email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP and update email
export const updateEmail = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    const userId = req.user.id;

    const record = await Otp.findOne({ email: newEmail, otp });
    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email: newEmail });
      return res.status(400).json({ message: "OTP expired" });
    }

    await User.findByIdAndUpdate(userId, { email: newEmail });
    await Otp.deleteMany({ email: newEmail });

    res.status(200).json({ message: "Email updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Verify OTP for registration
export const verifyUserOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await Otp.findOne({ email, otp });
    if (!record) return res.status(400).json({ message: "Invalid OTP" });

    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired. Please request again" });
    }

    await User.findOneAndUpdate({ email }, { isVerified: true });
    await Otp.deleteMany({ email });

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
