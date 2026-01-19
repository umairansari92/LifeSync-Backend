// backend/controllers/weatherController.js
// Uses OpenWeatherMap.org API

import axios from "axios";
import asyncHandler from "express-async-handler";

export const getWeatherData = asyncHandler(async (req, res) => {
    // Extract lat and lon from Query Parameters
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ 
            message: "Latitude and Longitude are required as query parameters (e.g., /weather?lat=24.8&lon=67.0)" 
        });
    }

    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ message: "Weather API key not configured." });
    }

    // Using OpenWeatherMap API URL structure
    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

    try {
        const { data } = await axios.get(weatherURL);

        // Date Formatting for display
        const today = new Date();
        
        // 1. Full Date Format (e.g., Wednesday, January 19, 2026)
        const fullDate = today.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // 2. Islamic Date Format (Hijri)
        const islamicDate = today.toLocaleDateString("en-US-u-ca-islamic", { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });

        // 3. OpenWeather Icon URL
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        res.json({
            city: data.name,
            country: data.sys.country,
            temperature: Math.round(data.main.temp), // Celsius
            description: data.weather[0].description,
            iconUrl: iconUrl,
            iconCode: iconCode,
            fullDate: fullDate,
            islamicDate: islamicDate,
            condition: data.weather[0].main, // e.g., 'Clouds', 'Clear', 'Rain'
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
            feelsLike: Math.round(data.main.feels_like)
        });

    } catch (error) {
        console.error("OpenWeatherMap API Error:", error.message);
        res.status(500).json({ 
            message: "Weather fetch failed. Check lat/lon or API Key.", 
            error: error.message 
        });
    }
});