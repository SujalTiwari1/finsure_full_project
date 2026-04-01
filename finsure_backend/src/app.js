import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import { getMongoStatus } from "./config/db.js";
import analysisRoutes from "./routes/analysis.routes.js";
import analyzeRoutes from "./routes/analyze.routes.js";
import authRoutes from "./routes/auth.routes.js";
import mlRoutes from "./routes/ml.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "finsure_backend",
    mongodb: getMongoStatus(),
  });
});

app.use("/api/analyze", analyzeRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);

app.use((err, _req, res, _next) => {
  if (err.code === 11000) {
    return res.status(409).json({ error: "Email is already registered." });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ error: first?.message || "Validation failed." });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large (max 10MB)." });
    }
    return res.status(400).json({ error: err.message || "Upload failed." });
  }
  if (err.message === "Only PDF uploads are allowed.") {
    return res.status(400).json({ error: err.message });
  }
  if (err.status && err.payload !== undefined) {
    const status = err.status;
    const detail = err.payload?.detail ?? err.payload;
    return res.status(status).json(
      typeof detail === "string"
        ? { error: detail, detail: err.payload }
        : { error: "Upstream ML service error", detail: err.payload }
    );
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error." });
});

export default app;
