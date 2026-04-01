import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Backend project root (contains `uploads/`). */
export const ROOT_DIR = path.join(__dirname, "..", "..");

/** Phase 3 PRD — local PDF storage directory. */
export const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
