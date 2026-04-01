import { Analysis } from "../models/Analysis.model.js";
import { forwardAnalyzeToMl } from "../services/ml.service.js";

function parseOptionalNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * POST /api/analyze — PRD §7: PDF → FastAPI full pipeline (parse → categorize → risk → recommend).
 * Requires auth. Phase 6: persists result for history.
 */
export async function analyze(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required (field name: file)." });
    }

    const { income, age, city, dependents, existing_term, existing_health } = req.body;

    if (city === undefined || city === null || String(city).trim() === "") {
      return res.status(400).json({ error: "city is required." });
    }

    const incomeNum = Number(income);
    const ageNum = Number(age);
    const depNum = Number(dependents);

    if (!Number.isFinite(incomeNum) || incomeNum <= 0) {
      return res.status(400).json({ error: "income must be a positive number." });
    }
    if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum)) {
      return res.status(400).json({ error: "age must be an integer." });
    }
    if (ageNum < 18 || ageNum > 70) {
      return res.status(400).json({ error: "age must be between 18 and 70." });
    }
    if (!Number.isFinite(depNum) || !Number.isInteger(depNum) || depNum < 0) {
      return res.status(400).json({ error: "dependents must be a non-negative integer." });
    }

    const existingTerm = parseOptionalNumber(existing_term, 0);
    const existingHealth = parseOptionalNumber(existing_health, 0);

    const payload = await forwardAnalyzeToMl({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      income: incomeNum,
      age: ageNum,
      city: String(city).trim(),
      dependents: depNum,
      existing_term: existingTerm,
      existing_health: existingHealth,
    });

    const resultCore = {
      transactions: payload.transactions,
      total_transactions: payload.total_transactions,
      cash_flow: payload.cash_flow,
      risk: payload.risk,
      recommendations: payload.recommendations,
    };

    const analysis = await Analysis.create({
      user: req.user.id,
      originalFilename: req.file.originalname || "",
      income: incomeNum,
      age: ageNum,
      city: String(city).trim(),
      dependents: depNum,
      existingTerm,
      existingHealth,
      result: resultCore,
    });

    return res.json({
      ...payload,
      analysisId: analysis.id,
    });
  } catch (err) {
    next(err);
  }
}
