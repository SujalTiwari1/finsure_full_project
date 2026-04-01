import path from "path";
import { UPLOADS_DIR } from "../config/paths.js";

/**
 * POST /api/upload — Phase 3 PRD: accept PDF, persist under `uploads/`.
 * Requires `requireAuth` so stored names are scoped by user id.
 */
export function uploadStatement(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "PDF file is required (field name: file)." });
  }

  const relativePath = path.relative(UPLOADS_DIR, req.file.path).split(path.sep).join("/");

  return res.status(201).json({
    message: "File uploaded",
    storedFilename: req.file.filename,
    relativePath: `uploads/${relativePath}`,
    originalName: req.file.originalname,
    size: req.file.size,
  });
}
