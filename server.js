import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import namazRoutes from "./routes/namazRoutes.js";
import quranRoutes from "./routes/quranRoutes.js";
import tasbeehRoutes from "./routes/tasbeehRoutes.js";
import specialExpenseRoutes from "./routes/specialExpenseRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";

dotenv.config();
connectDB();
const app = express();
app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://life-sync-beryl.vercel.app",
  "http://localhost:5173",
  "https://life-sync-frontend.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("LifeSync Server is running! ✅");
});

// Note Routes
app.use("/api/notes", noteRoutes);

// Task Routes
app.use("/api/tasks", taskRoutes);

// Expense Routes
app.use("/api/expenses", expenseRoutes);

// Shopping List Routes
import shoppingListRoutes from "./routes/shoppingListRoutes.js";
app.use("/api/shopping", shoppingListRoutes);

// Dashboard Routes
app.use("/api/dashboard", dashboardRoutes);

//Namaz

app.use("/api/namaz", namazRoutes);

// Hijri Date Routes
import hijriRoutes from "./routes/hijriRoutes.js";
app.use("/api", hijriRoutes);

// Quran API Routes
app.use("/api/quran", quranRoutes);

// Tasbeeh API Routes
app.use("/api/tasbeeh", tasbeehRoutes);

// Special Expense Routes
app.use("/api/special-expense", specialExpenseRoutes);

// Income & Finance Routes

// Income & Finance Routes
import incomeRoutes from "./routes/incomeRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";

app.use("/api/income", incomeRoutes);
app.use("/api/finance", financeRoutes);

// Weather API Routes

// Loan Routes
app.use("/api/loans", loanRoutes);

import weatherRoutes from "./routes/weatherRoutes.js";
app.use("/api/weather", weatherRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
