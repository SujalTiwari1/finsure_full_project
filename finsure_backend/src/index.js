import app from "./app.js";
import { connectDB } from "./config/db.js";
import { JWT_REFRESH_SECRET, JWT_SECRET, PORT } from "./config/env.js";

async function main() {
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    throw new Error(
      "JWT_SECRET must be set in .env and be at least 16 characters (Phase 2 PRD)."
    );
  }
  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 16) {
    throw new Error(
      "JWT_REFRESH_SECRET must be set in .env and be at least 16 characters."
    );
  }
  await connectDB();
  app.listen(PORT, () => {
    console.log(`FinSure backend listening on http://127.0.0.1:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
