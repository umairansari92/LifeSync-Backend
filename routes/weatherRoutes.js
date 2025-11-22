// backend/routes/weatherRoutes.js (FINAL FIX)

import express from "express";
// import { protect } from "../middleware/authMiddleware.js"; // Hata diya gaya, agar public chahiye

import { getWeatherData } from "../controllers/weatherController.js";

const router = express.Router();

// 1. Corrected method from POST to GET
// 2. Removed 'protect' middleware (assuming weather data is publicly accessible on dashboard)
// @route GET /api/weather?lat=x&lon=y
router.get("/", getWeatherData); 

export default router;