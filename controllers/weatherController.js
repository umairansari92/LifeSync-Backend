// backend/controllers/weatherController.js

import axios from "axios";
import asyncHandler from "express-async-handler"; // Assuming you want to wrap it in asyncHandler

export const getWeatherData = asyncHandler(async (req, res) => {
    // ⚠️ Change: Extract lat and lon from Query Parameters (Standard for GET requests)
    const { lat, lon } = req.query; // Previously req.body;

    if (!lat || !lon) {
        return res.status(400).json({ message: "Latitude and Longitude are required as query parameters (e.g., /weather?lat=x&lon=y)" });
    }

    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ message: "Weather API key not configured." });
    }

    // Using OpenWeatherMap URL structure
    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
        const { data } = await axios.get(weatherURL);

        // Date Formatting for display
        const today = new Date();
        
        // 1. Full Date Format (e.g., Wednesday, November 20, 2025)
        const fullDate = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        // 2. Islamic Date Format (ar-SA for Arabic/Saudi Arabia)
        const islamicDate = today.toLocaleDateString("en-US-u-ca-islamic", { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });

        // 3. OpenWeather Icon URL (Icon name ko URL mein fit karna)
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        res.json({
            city: data.name,
            country: data.sys.country,
            temperature: Math.round(data.main.temp), // Rounding temperature for cleaner display
            description: data.weather[0].description,
            iconUrl: iconUrl, // Sending the full URL
            fullDate: fullDate,
            islamicDate: islamicDate,
            condition: data.weather[0].main // e.g., 'Clouds', 'Clear'
        });

    } catch (error) {
        console.error("OpenWeather API Error:", error.message);
        // Better error response if API call fails
        res.status(500).json({ 
            message: "Weather fetch failed. Check lat/lon or API Key.", 
            error: error.message 
        });
    }
});