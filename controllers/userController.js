
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { Readable } from "stream";
import bcrypt from "bcrypt";
// import Otp from "../models/otp.js";
// import { generateOtp } from "../utils/generateOtp.js";
// import { sendEmail } from "../utils/sendEmail.js";
// import { generateOtpEmail } from "../utils/emailTemplates.js";
import Notes from "../models/note.js";
import Tasks from "../models/taskModel.js";
import Expenses from "../models/expenseModel.js";
import User from "../models/user.js";

export const getProfile = (req, res) => {
  const user = req.user; // from middleware
  res.status(200).json({ user });
};
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({
      user,
      message: "User profile fetched successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



export const updateProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const filePath = req.file.path;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "LifeSync/profile",
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    });

    // Remove local file after upload
    fs.unlinkSync(filePath);

    // Save Cloudinary URL
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: result.secure_url },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      message: "Profile picture updated",
      imageUrl: result.secure_url,
      user: updatedUser
    });

  } catch (error) {
    console.log("Profile Pic Error: ", error);
    return res.status(500).json({ message: "Upload failed", error: error.message });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const { firstname, lastname, phone, location } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstname,
        lastname,
        phone,
        location,
      },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Profile updated",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Change Password by profile
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both old and new passwords are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const requestAccountDeleteOtp = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email: user.email });

    await Otp.create({
      email: user.email,
      otp: otpCode,
      expiresAt,
    });

    const htmlContent = generateOtpEmail({
      app_name: "LifeSync",
      otp_code: otpCode,
      expiry_minutes: 10,
      verify_url: `https://lifsync.com/verify?email=${user.email}&otp=${otpCode}`,
      company_address: "Karachi Pakistan",
      user_email: user.email,
    });

    await sendEmail(user.email, "Verify your LifeSync account", htmlContent);

    return res.status(200).json({
      message: "OTP sent to your email for account deletion",
    });
  } catch (error) {
    console.log("requestAccountDeleteOtp Error: ", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// Account delete with OTP verification and full data removal
export const verifyDeleteAccount = async (req, res) => {
  try {
    const { otp } = req.body;
    const loggedUser = req.user;

    const record = await Otp.findOne({ email: loggedUser.email, otp });
    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email: loggedUser.email });
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findById(loggedUser.id).select("profileImage");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.profileImage) {
      try {
        const publicId = user.profileImage.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`LifeSync/profile/${publicId}`);
      } catch (err) {
        console.log("Cloudinary delete failed");
      }
    }

    await Notes.deleteMany({ user: loggedUser.id });
    await Tasks.deleteMany({ user: loggedUser.id });
    await Expenses.deleteMany({ user: loggedUser.id });

    await User.findByIdAndDelete(loggedUser.id);
    await Otp.deleteMany({ email: loggedUser.email });

    res.clearCookie("ls_token");

    return res.status(200).json({
      message: "Account and all related data deleted successfully",
    });
  } catch (error) {
    console.log("Delete process error", error);
    return res.status(500).json({ message: "Server error" });
  }
};
