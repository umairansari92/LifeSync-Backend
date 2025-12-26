import express from "express";
import { getHijriDate } from "../controllers/hijriController.js";

const router = express.Router();

router.get("/hijri", getHijriDate);

export default router;
