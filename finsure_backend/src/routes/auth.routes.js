import { Router } from "express";
import {
  login,
  logout,
  profile,
  refresh,
  signup,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", requireAuth, logout);
router.get("/profile", requireAuth, profile);

export default router;
