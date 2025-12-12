import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 20,
  message: "Too many requests from this IP, please try again after 5 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Too many login/registration attempts, please try again in 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
