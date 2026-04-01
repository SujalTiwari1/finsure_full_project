import fs from "fs";
import multer from "multer";
import path from "path";
import { UPLOADS_DIR } from "../config/paths.js";

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MAX_BYTES = 10 * 1024 * 1024;

function pdfFileFilter(_req, file, cb) {
  const ok =
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/octet-stream";
  if (!ok) {
    cb(new Error("Only PDF uploads are allowed."));
    return;
  }
  cb(null, true);
}

/**
 * Phase 3 PRD — multer instance: single PDF field `file`, stored on disk under `uploads/`.
 */
export const uploadPdfToDisk = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, UPLOADS_DIR);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname) || ".pdf";
      const stem = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 80);
      cb(null, `${req.user.id}_${Date.now()}_${stem}${ext}`);
    },
  }),
  limits: { fileSize: MAX_BYTES },
  fileFilter: pdfFileFilter,
});
