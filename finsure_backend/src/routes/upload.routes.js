import { Router } from "express";
import { uploadStatement } from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadPdfToDisk } from "../middleware/uploadPdf.middleware.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  uploadPdfToDisk.single("file"),
  uploadStatement
);

export default router;
