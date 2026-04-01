/**
 * Phase 4 PRD — hit Node `/api/ml/pipeline` (requires ML FastAPI on ML_SERVICE_URL).
 * Start: finsure_ml → port 8000; finsure_backend → port 5000.
 *
 *   npm run test:ml
 *
 * Optional: BASE_URL=http://127.0.0.1:5000
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

const transactions = [
  {
    date: "2024-01-15",
    description: "SALARY - ACME CORP",
    amount: 50000,
    type: "credit",
    category: null,
  },
  {
    date: "2024-01-16",
    description: "RENT - LANDLORD",
    amount: 15000,
    type: "debit",
    category: null,
  },
  {
    date: "2024-01-18",
    description: "GROCERY MART",
    amount: 3500,
    type: "debit",
    category: null,
  },
];

const body = {
  transactions,
  income: 50000,
  dependents: 1,
  age: 30,
  city: "Mumbai",
  existing_term: 0,
  existing_health: 0,
};

async function main() {
  const res = await fetch(`${BASE}/api/ml/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("pipeline failed", res.status, json);
    process.exit(1);
  }
  if (!json.success || !json.categorize || !json.risk || !json.recommend) {
    console.error("unexpected shape", json);
    process.exit(1);
  }
  console.log(
    "ML pipeline OK | categorized:",
    json.categorize.total,
    "| FRI:",
    json.risk.fri_score,
    "| risk_level:",
    json.risk.risk_level
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
