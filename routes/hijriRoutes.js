import express from "express";
import { getHijriDate } from "../controllers/hijriController";
const router = express.Router();

// Route Example: /api/hijri?lat=24.86&lng=67.00&adjustment=1
router.get("/hijri", getHijriDate);

module.exports = router;
