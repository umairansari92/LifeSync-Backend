import express from "express";
import { changePassword, getProfile, getUserProfile, requestAccountDeleteOtp, updateProfile, updateProfilePic, verifyDeleteAccount } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/multerConfig.js";

const router = express.Router();

router.get("/me", protect, getProfile);

// Get user profile Pic
router.get("/profile", protect, getUserProfile);
router.put("/upload-avatar", protect, upload.single("avatar"), updateProfilePic);

// Update user profile
router.put("/update-profile", protect, updateProfile);

// Change Password by profile
router.patch("/change-password", protect, changePassword);




router.post("/delete/request-otp", protect, requestAccountDeleteOtp);
router.post("/delete/verify", protect, verifyDeleteAccount);
export default router;

