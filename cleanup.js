import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
console.log("Loaded URI:", process.env.MONGODB_URI);

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to Atlas");

    // Models (simplified, adjust according to your schema)
    const User = mongoose.model("User", new mongoose.Schema({ email: String }));
    const Expense = mongoose.model("Expense", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const Income = mongoose.model("Income", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const Namaz = mongoose.model("Namaz", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const Note = mongoose.model("Note", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const Otp = mongoose.model("Otp", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const QuranReading = mongoose.model("QuranReading", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const ShoppingList = mongoose.model("ShoppingList", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const SpecialExpenseCard = mongoose.model("SpecialExpenseCard", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const SpecialExpenseEntry = mongoose.model("SpecialExpenseEntry", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const TasbeehReading = mongoose.model("TasbeehReading", new mongoose.Schema({ userId: mongoose.ObjectId }));
    const Task = mongoose.model("Task", new mongoose.Schema({ userId: mongoose.ObjectId }));

    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const invalidUsers = await User.find({ email: { $not: { $regex: emailRegex } } });
    console.log(`Found ${invalidUsers.length} invalid users`);

    for (const user of invalidUsers) {
      console.log(`Deleting user: ${user.email}`);
      const userId = user._id;

      await Promise.all([
        Expense.deleteMany({ userId }),
        Income.deleteMany({ userId }),
        Namaz.deleteMany({ userId }),
        Note.deleteMany({ userId }),
        Otp.deleteMany({ userId }),
        QuranReading.deleteMany({ userId }),
        ShoppingList.deleteMany({ userId }),
        SpecialExpenseCard.deleteMany({ userId }),
        SpecialExpenseEntry.deleteMany({ userId }),
        TasbeehReading.deleteMany({ userId }),
        Task.deleteMany({ userId }),
      ]);

      await User.deleteOne({ _id: userId });
    }

    console.log("Cleanup complete!");
  } catch (err) {
    console.error("❌ Error during cleanup:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
