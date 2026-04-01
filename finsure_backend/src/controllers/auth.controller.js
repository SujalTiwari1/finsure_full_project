import { User } from "../models/User.model.js";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "../services/auth.service.js";

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toPublicUser(doc) {
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    age: doc.age,
    city: doc.city,
    dependents: doc.dependents,
    income: doc.income,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, age, city, dependents, income } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email is required." });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "password must be at least 8 characters." });
    }

    const ageNum = Number(age);
    const depNum = Number(dependents);
    const incNum = Number(income);

    if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) {
      return res.status(400).json({ error: "age must be an integer between 18 and 100." });
    }
    if (!Number.isFinite(depNum) || !Number.isInteger(depNum) || depNum < 0) {
      return res.status(400).json({ error: "dependents must be a non-negative integer." });
    }
    if (!Number.isFinite(incNum) || incNum < 0) {
      return res.status(400).json({ error: "income must be a non-negative number." });
    }
    if (!city || typeof city !== "string" || !city.trim()) {
      return res.status(400).json({ error: "city is required." });
    }

    const hashed = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      age: ageNum,
      city: city.trim(),
      dependents: depNum,
      income: incNum,
    });

    const seq = user.refreshSeq ?? 0;
    const token = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id, seq);
    return res.status(201).json({
      token,
      refreshToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email is required." });
    }
    if (typeof password !== "string" || !password) {
      return res.status(400).json({ error: "password is required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      "+password"
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const seq = user.refreshSeq ?? 0;
    const token = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id, seq);
    const safe = await User.findById(user.id);
    return res.json({
      token,
      refreshToken,
      user: toPublicUser(safe),
    });
  } catch (err) {
    next(err);
  }
}

export async function profile(req, res) {
  return res.json({ user: toPublicUser(req.user) });
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (typeof refreshToken !== "string" || !refreshToken.trim()) {
      return res.status(400).json({ error: "refreshToken is required." });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken.trim());
    } catch {
      return res.status(401).json({ error: "Invalid or expired refresh token." });
    }

    if (payload.typ !== "refresh") {
      return res.status(401).json({ error: "Invalid token type." });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists." });
    }

    const seq = user.refreshSeq ?? 0;
    if (payload.v !== seq) {
      return res.status(401).json({ error: "Refresh token revoked." });
    }

    const token = signAccessToken(user.id);
    return res.json({ token });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { refreshSeq: 1 } });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
