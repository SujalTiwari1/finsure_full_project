import { Router } from "express";
import {
  categorize,
  pipeline,
  recommend,
  riskScore,
} from "../controllers/ml.controller.js";

const router = Router();

/** Proxies to FastAPI `POST /categorize/` */
router.post("/categorize", categorize);
/** Proxies to FastAPI `POST /risk-score/` */
router.post("/risk-score", riskScore);
/** Proxies to FastAPI `POST /recommend/` */
router.post("/recommend", recommend);
/** Chains categorize → risk-score → recommend (Phase 4 PRD) */
router.post("/pipeline", pipeline);

export default router;
