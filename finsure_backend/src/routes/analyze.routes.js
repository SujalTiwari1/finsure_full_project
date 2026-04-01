import { Router } from "express";
import multer from "multer";
import { analyze } from "../controllers/analyze.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/octet-stream";
    if (!ok) {
      cb(new Error("Only PDF uploads are allowed."));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post("/", requireAuth, upload.single("file"), analyze);

export default router;
