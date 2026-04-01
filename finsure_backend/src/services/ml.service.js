import { ML_SERVICE_URL } from "../config/env.js";

/**
 * POST JSON to the FastAPI service; throws with `.status` and `.payload` on failure.
 * @param {string} path - e.g. `/categorize/`
 * @param {object} body
 * @returns {Promise<object>}
 */
export async function callMlJson(path, body) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${ML_SERVICE_URL}${normalized}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("application/json")
    ? await res.json()
    : { raw: await res.text() };

  if (!res.ok) {
    const err = new Error("ML service request failed");
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

/** Phase 4 PRD — FastAPI `POST /categorize/` */
export function forwardCategorizeToMl(body) {
  return callMlJson("/categorize/", body);
}

/** Phase 4 PRD — FastAPI `POST /risk-score/` */
export function forwardRiskScoreToMl(body) {
  return callMlJson("/risk-score/", body);
}

/** Phase 4 PRD — FastAPI `POST /recommend/` */
export function forwardRecommendToMl(body) {
  return callMlJson("/recommend/", body);
}

/**
 * Chains categorize → risk-score → recommend (maps `breakdown` → `fri_breakdown`).
 * @param {object} params
 * @param {Array} params.transactions
 * @param {number} params.income
 * @param {number} params.dependents
 * @param {number} params.age
 * @param {string} params.city
 * @param {number} [params.existing_term]
 * @param {number} [params.existing_health]
 */
export async function runMlPipeline({
  transactions,
  income,
  dependents,
  age,
  city,
  existing_term = 0,
  existing_health = 0,
}) {
  const categorize = await forwardCategorizeToMl({ transactions });
  const txs = categorize.transactions;
  const risk = await forwardRiskScoreToMl({
    income,
    dependents,
    transactions: txs,
  });
  const recommend = await forwardRecommendToMl({
    income,
    age,
    city,
    dependents,
    fri_score: risk.fri_score,
    fri_breakdown: risk.breakdown,
    features: risk.features,
    existing_term,
    existing_health,
  });

  return { categorize, risk, recommend };
}

/**
 * Forwards multipart analysis to the Python ML service (PRD §7 / §8).
 * @param {object} params
 * @param {Buffer} params.buffer
 * @param {string} params.originalname
 * @param {string} params.mimetype
 * @param {number} params.income
 * @param {number} params.age
 * @param {string} params.city
 * @param {number} params.dependents
 * @param {number} [params.existing_term]
 * @param {number} [params.existing_health]
 * @returns {Promise<object>} Parsed JSON body from ML
 */
export async function forwardAnalyzeToMl({
  buffer,
  originalname,
  mimetype,
  income,
  age,
  city,
  dependents,
  existing_term = 0,
  existing_health = 0,
}) {
  const url = `${ML_SERVICE_URL}/analyze/`;
  const form = new FormData();
  const blob = new Blob([buffer], {
    type: mimetype || "application/pdf",
  });
  form.append("file", blob, originalname || "statement.pdf");
  form.append("income", String(income));
  form.append("age", String(age));
  form.append("city", city);
  form.append("dependents", String(dependents));
  form.append("existing_term", String(existing_term));
  form.append("existing_health", String(existing_health));

  const res = await fetch(url, { method: "POST", body: form });
  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("application/json")
    ? await res.json()
    : { raw: await res.text() };

  if (!res.ok) {
    const err = new Error("ML service request failed");
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}
