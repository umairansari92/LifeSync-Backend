import { verifyAccessToken } from "../utils/jwtUtils.js";
import User from "../models/user.js";

export const protect = async (req, res, next) => {
  try {
    // read token from cookie
    const token = req.cookies?.ls_token || null;
    if (!token) return res.status(401).json({ message: "Not authenticated" });
      console.log(token);
    const decoded = verifyAccessToken(token);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    console.error("Protect middleware error:", error);
    return res.status(401).json({ message: "Not authenticated" });
  }
};
export default protect;