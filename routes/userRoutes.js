import express from "express";
import { changePassword, getProfile, getUserProfile, requestAccountDeleteOtp, updateProfile, updateProfilePic, verifyDeleteAccount } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/multerConfig.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/me", protect, getProfile);

// Get user profile Pic
router.get("/profile", protect, generalLimiter, getUserProfile);
router.put("/upload-avatar", protect, generalLimiter, upload.single("avatar"), updateProfilePic);

// Update user profile
router.put("/update-profile", protect, generalLimiter, updateProfile);
// Change Password by profile
router.patch("/change-password", protect, generalLimiter, changePassword);


router.post("/delete/request-otp", protect, generalLimiter, requestAccountDeleteOtp);
router.post("/delete/verify", protect, generalLimiter, verifyDeleteAccount);
export default router;

