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
import Namaz from "./models/namazModel.js";
import namazRoutes from "./routes/namazRoutes.js";

dotenv.config();
connectDB();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
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
// Weather API Routes

import weatherRoutes from "./routes/weatherRoutes.js";
app.use("/api/weather", weatherRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});