import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  requestEmailUpdateOtp,
  updateEmail,
  verifyEmailOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import upload from "../middleware/multerConfig.js";
import protect from "../middleware/authMiddleware.js";
import { authLimiter, generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", authLimiter, upload.single("image"), registerUser);
router.post("/verify-otp", verifyEmailOtp);
router.post("/resend-otp", authLimiter, resendOtp);
router.post("/login", authLimiter, loginUser);
router.post("/logout", logoutUser);

// Forgot Password and Reset Password
router.post("/forgot-password", authLimiter, forgotPassword);
// router.post("/verify-reset-otp",generalLimiter,  verifyResetOtp);
router.post("/reset-password", resetPassword);

// Update Email and Verification
router.post("/request-email-update-otp", protect, requestEmailUpdateOtp);
router.post("/update-email", protect, updateEmail);

export default router;
