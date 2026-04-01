import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

export const PORT = Number(process.env.PORT) || 5000;

/** MongoDB connection string (Phase 1 PRD). Accepts MONGODB_URI or MONGO_URI. */
export const MONGODB_URI = (
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  ""
).trim();

/** Base URL of the FinSure FastAPI service (no trailing slash). */
export const ML_SERVICE_URL = (
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

/** Max wait for each ML `fetch` (ms). Prevents hung workers from a stuck FastAPI. */
export const ML_REQUEST_TIMEOUT_MS =
  Number(process.env.ML_REQUEST_TIMEOUT_MS) || 120_000;

/** Phase 2 PRD — JWT access tokens */
export const JWT_SECRET = (process.env.JWT_SECRET || "").trim();

/**
 * Passed to jsonwebtoken `expiresIn`. If purely numeric, treated as seconds.
 * Otherwise use a string like `7d` or `1h`.
 */
export const JWT_EXPIRES_IN = (() => {
  const v = (process.env.JWT_EXPIRES_IN || "7d").trim();
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v;
})();

/** Long-lived refresh tokens (separate secret). */
export const JWT_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || "").trim();

export const JWT_REFRESH_EXPIRES_IN = (() => {
  const v = (process.env.JWT_REFRESH_EXPIRES_IN || "30d").trim();
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v;
})();
