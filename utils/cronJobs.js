import cron from "node-cron";
import User from "../models/user.js";
import Otp from "../models/otp.js";
import Notes from "../models/note.js";
import Tasks from "../models/taskModel.js";
import Expenses from "../models/expenseModel.js";
import cloudinary from "../config/cloudinary.js"; // If we need to delete images

export const startCronJobs = () => {
  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Running Cron Job: Cleanup Unverified Users...");
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const unverifiedUsers = await User.find({
        isVerified: false,
        createdAt: { $lt: sevenDaysAgo },
      });

      console.log(
        `Found ${unverifiedUsers.length} unverified users to delete.`,
      );

      for (const user of unverifiedUsers) {
        // Delete associated data
        await Notes.deleteMany({ user: user._id });
        await Tasks.deleteMany({ user: user._id });
        await Expenses.deleteMany({ user: user._id });
        await Otp.deleteMany({ email: user.email });

        // Delete profile image from Cloudinary if exists
        if (user.profileImage) {
          try {
            // Assuming URL structure allows extraction of public ID or we just ignore if complex
            // user.profileImage.split("/").pop().split(".")[0];
            // For safety, might skip or do a best effort
            // const publicId = ...
            // await cloudinary.uploader.destroy(...)
          } catch (err) {
            console.error(`Failed to delete image for user ${user._id}`);
          }
        }

        // Delete user
        await User.findByIdAndDelete(user._id);
      }

      console.log("Cleanup complete.");
    } catch (error) {
      console.error("Error in Cleanup Cron Job:", error);
    }
  });
};
