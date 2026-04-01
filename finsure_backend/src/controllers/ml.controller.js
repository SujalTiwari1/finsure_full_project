import {
  forwardCategorizeToMl,
  forwardRecommendToMl,
  forwardRiskScoreToMl,
  runMlPipeline,
} from "../services/ml.service.js";

function isTxnArray(v) {
  return Array.isArray(v) && v.length > 0;
}

function parseOptionalNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Phase 4 — proxy: body matches FastAPI CategorizeRequest */
export async function categorize(req, res, next) {
  try {
    const { transactions } = req.body;
    if (!isTxnArray(transactions)) {
      return res.status(400).json({
        error: "transactions must be a non-empty array.",
      });
    }
    const data = await forwardCategorizeToMl({ transactions });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/** Phase 4 — proxy: body matches FastAPI RiskScoreRequest */
export async function riskScore(req, res, next) {
  try {
    const { income, dependents, transactions } = req.body;
    if (!Number.isFinite(Number(income)) || Number(income) <= 0) {
      return res.status(400).json({ error: "income must be a positive number." });
    }
    const dep = Number(dependents);
    if (!Number.isInteger(dep) || dep < 0) {
      return res.status(400).json({ error: "dependents must be a non-negative integer." });
    }
    if (!isTxnArray(transactions)) {
      return res.status(400).json({
        error: "transactions must be a non-empty array.",
      });
    }
    const data = await forwardRiskScoreToMl({
      income: Number(income),
      dependents: dep,
      transactions,
    });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/** Phase 4 — proxy: body matches FastAPI RecommendationRequest */
export async function recommend(req, res, next) {
  try {
    const {
      income,
      age,
      city,
      dependents,
      fri_score,
      fri_breakdown,
      features,
      existing_term,
      existing_health,
    } = req.body;

    if (!Number.isFinite(Number(income)) || Number(income) <= 0) {
      return res.status(400).json({ error: "income must be a positive number." });
    }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 70) {
      return res
        .status(400)
        .json({ error: "age must be an integer between 18 and 70 (ML contract)." });
    }
    if (!city || typeof city !== "string" || !city.trim()) {
      return res.status(400).json({ error: "city is required." });
    }
    const dep = Number(dependents);
    if (!Number.isInteger(dep) || dep < 0) {
      return res.status(400).json({ error: "dependents must be a non-negative integer." });
    }
    const fri = Number(fri_score);
    if (!Number.isFinite(fri)) {
      return res.status(400).json({ error: "fri_score is required." });
    }
    if (!fri_breakdown || typeof fri_breakdown !== "object") {
      return res.status(400).json({ error: "fri_breakdown object is required." });
    }
    if (!features || typeof features !== "object") {
      return res.status(400).json({ error: "features object is required." });
    }

    const data = await forwardRecommendToMl({
      income: Number(income),
      age: ageNum,
      city: city.trim(),
      dependents: dep,
      fri_score: fri,
      fri_breakdown,
      features,
      existing_term: parseOptionalNumber(existing_term, 0),
      existing_health: parseOptionalNumber(existing_health, 0),
    });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/** Phase 4 — categorize → risk-score → recommend in one request */
export async function pipeline(req, res, next) {
  try {
    const {
      transactions,
      income,
      dependents,
      age,
      city,
      existing_term,
      existing_health,
    } = req.body;

    if (!isTxnArray(transactions)) {
      return res.status(400).json({
        error: "transactions must be a non-empty array.",
      });
    }
    if (!Number.isFinite(Number(income)) || Number(income) <= 0) {
      return res.status(400).json({ error: "income must be a positive number." });
    }
    const dep = Number(dependents);
    if (!Number.isInteger(dep) || dep < 0) {
      return res.status(400).json({ error: "dependents must be a non-negative integer." });
    }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 70) {
      return res
        .status(400)
        .json({ error: "age must be an integer between 18 and 70 (ML contract)." });
    }
    if (!city || typeof city !== "string" || !city.trim()) {
      return res.status(400).json({ error: "city is required." });
    }

    const { categorize: cat, risk, recommend: rec } = await runMlPipeline({
      transactions,
      income: Number(income),
      dependents: dep,
      age: ageNum,
      city: city.trim(),
      existing_term: parseOptionalNumber(existing_term, 0),
      existing_health: parseOptionalNumber(existing_health, 0),
    });

    return res.json({
      success: true,
      categorize: cat,
      risk,
      recommend: rec,
    });
  } catch (err) {
    next(err);
  }
}
