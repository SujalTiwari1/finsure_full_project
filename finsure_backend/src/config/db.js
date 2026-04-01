import mongoose from "mongoose";
import { MONGODB_URI } from "./env.js";

const READY = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export function getMongoStatus() {
  return READY[mongoose.connection.readyState] ?? "unknown";
}

/**
 * Phase 1 (PRD): establish MongoDB connection before serving traffic.
 */
export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Example: mongodb://127.0.0.1:27017/finsure"
    );
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");
}
