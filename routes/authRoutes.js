import express from "express";
import { registerUser, verifyOtp, loginUser, logoutUser, requestEmailUpdateOtp, updateEmail } from "../controllers/authController.js";
import { forgotPassword, resetPassword, verifyResetOtp } from "../controllers/authController.js";
import upload from "../middleware/multerConfig.js";
import protect from "../middleware/authMiddleware.js";
// import { authLimiter, generalLimiter } from "../middleware/rateLimiter.js";


const router = express.Router();

router.post("/register",  upload.single("image"), registerUser); //authLimiter
router.post("/verify-otp", verifyOtp);
router.post("/login",  loginUser); //authLimiter
router.post("/logout", logoutUser);


// Forgot Password and Reset Password
router.post("/forgot-password",  forgotPassword); //authLimiter
router.post("/verify-reset-otp",  verifyResetOtp); //generalLimiter
router.post("/reset-password", resetPassword);


// Update Email and Verification
router.post("/request-email-update-otp", protect, requestEmailUpdateOtp);
router.post("/update-email", protect, updateEmail);


export default router;
