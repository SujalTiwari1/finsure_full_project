import { User } from "../models/User.model.js";
import { verifyAccessToken } from "../services/auth.service.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Missing bearer token." });
  }

  try {
    const payload = verifyAccessToken(token);
    const id = payload.sub;
    if (!id) {
      return res.status(401).json({ error: "Invalid token payload." });
    }

    const user = await User.findById(id).select("-password").lean();
    if (!user) {
      return res.status(401).json({ error: "User no longer exists." });
    }

    req.user = { ...user, id: String(user._id) };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
