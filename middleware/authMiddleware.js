import { verifyAccessToken } from "../utils/jwtUtils.js";
import User from "../models/user.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.ls_token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = verifyAccessToken(token);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Not authenticated" });
  }
};

export default protect;
