import jwt from "jsonwebtoken";

export const signAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
};

export const verifyAccessToken = (token) => {
  // console.log(token);
  return jwt.verify(token, process.env.JWT_SECRET);
};