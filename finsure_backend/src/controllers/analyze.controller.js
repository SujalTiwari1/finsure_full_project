import { forwardAnalyzeToMl } from "../services/ml.service.js";

function parseOptionalNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * POST /api/analyze — PRD §7: proxy full pipeline to FastAPI /analyze/
 */
export async function analyze(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required (field name: file)." });
    }

    const { income, age, city, dependents, existing_term, existing_health, userId } =
      req.body;

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
    if (!Number.isFinite(depNum) || !Number.isInteger(depNum) || depNum < 0) {
      return res.status(400).json({ error: "dependents must be a non-negative integer." });
    }

    const payload = await forwardAnalyzeToMl({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      income: incomeNum,
      age: ageNum,
      city: String(city).trim(),
      dependents: depNum,
      existing_term: parseOptionalNumber(existing_term, 0),
      existing_health: parseOptionalNumber(existing_health, 0),
    });

    if (userId !== undefined) payload.userId = userId;
    return res.json(payload);
  } catch (err) {
    next(err);
  }
}
