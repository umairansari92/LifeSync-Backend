import express from "express";
import { getHijriDate } from "../controllers/hijriController.js"; // note .js extension

const router = express.Router();

// /api/hijri?lat=..&lng=..&adjustment=..
router.get("/hijri", getHijriDate);

export default router;
