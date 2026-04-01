import { Router } from "express";
import {
  getAnalysisById,
  listMyAnalyses,
} from "../controllers/analysis.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, listMyAnalyses);
router.get("/:analysisId", requireAuth, getAnalysisById);

export default router;
