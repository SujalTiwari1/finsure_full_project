"""
Analyze Service — Full pipeline in a single call.

Flow:
    PDF bytes
        ↓
    parse_bank_statement()       → raw transactions
        ↓
    categorize_transactions()    → transactions with categories
        ↓
    compute_risk_score()         → FRI score + breakdown
        ↓
    generate_recommendations()   → insurance recommendations
"""

from io import BytesIO

from services.parser_service          import parse_bank_statement
from services.categorizer_service     import categorize_transactions
from services.risk_service            import compute_risk_score
from services.recommendation_service  import generate_recommendations
from utils.logger                     import get_logger

logger = get_logger(__name__)


def run_full_analysis(
    pdf_bytes:       bytes,
    income:          float,
    age:             int,
    city:            str,
    dependents:      int,
    existing_term:   float,
    existing_health: float,
    categorizer,
    label_encoder,
    risk_artifact:   dict,
) -> dict:
    """
    Runs the complete FinSure pipeline end-to-end.

    Args:
        pdf_bytes       : raw PDF file bytes
        income          : monthly income in ₹
        age             : user age
        city            : city of residence
        dependents      : number of dependents
        existing_term   : existing term cover in ₹ (0 if none)
        existing_health : existing health cover in ₹ (0 if none)
        categorizer     : loaded TF-IDF + LR pipeline (from app.state)
        label_encoder   : loaded label encoder (from app.state)
        risk_artifact   : loaded XGBoost model dict (from app.state)

    Returns:
        Full analysis dict with transactions, cash flow, FRI, and recommendations.
    """

    logger.info("🔄 Starting full pipeline analysis...")

    # ── Step 1: Parse PDF ─────────────────────────────────────
    logger.info("  [1/4] Parsing PDF...")
    parsed = parse_bank_statement(BytesIO(pdf_bytes))
    transactions = parsed["transactions"]

    # ── Step 2: Categorize Transactions ───────────────────────
    logger.info("  [2/4] Categorizing transactions...")
    transactions = categorize_transactions(transactions, categorizer, label_encoder)

    # ── Step 3: Compute FRI Risk Score ────────────────────────
    logger.info("  [3/4] Computing FRI risk score...")
    risk_result = compute_risk_score(
        transactions  = transactions,
        income        = income,
        dependents    = dependents,
        risk_artifact = risk_artifact,
    )

    # ── Step 4: Generate Recommendations ──────────────────────
    logger.info("  [4/4] Generating recommendations...")
    recommendations = generate_recommendations(
        income          = income,
        age             = age,
        city            = city,
        dependents      = dependents,
        fri_score       = risk_result["fri_score"],
        fri_breakdown   = risk_result["breakdown"],
        features        = risk_result["features"],
        existing_term   = existing_term,
        existing_health = existing_health,
    )

    # ── Cash Flow Summary ──────────────────────────────────────
    category_totals = _compute_category_totals(transactions)
    runway_months   = _compute_runway(
        savings_amount = risk_result["features"]["savings_amount"],
        total_expenses = risk_result["features"]["total_expenses"],
    )

    logger.info("✅ Full pipeline complete")

    return {
        # Raw data
        "transactions":       transactions,
        "total_transactions": parsed["total_transactions"],

        # Cash flow
        "cash_flow": {
            "total_income":    parsed["total_credits"],
            "total_expenses":  parsed["total_debits"],
            "savings":         risk_result["features"]["savings_amount"],
            "savings_rate_pct": round(risk_result["features"]["savings_rate"] * 100, 1),
            "emi_amount":      risk_result["features"]["emi_amount"],
            "emi_ratio_pct":   round(risk_result["features"]["emi_ratio"] * 100, 1),
            "category_totals": category_totals,
            "runway_months":   runway_months,
        },

        # Risk
        "risk": {
            "fri_score":  risk_result["fri_score"],
            "risk_level": risk_result["risk_level"],
            "breakdown":  risk_result["breakdown"],
        },

        # Recommendations
        "recommendations": recommendations,
    }


def _compute_category_totals(transactions: list[dict]) -> dict:
    """Sums debit amounts per category."""
    totals: dict[str, float] = {}
    for txn in transactions:
        if txn["type"] == "debit":
            cat = txn.get("category") or "other"
            totals[cat] = round(totals.get(cat, 0) + txn["amount"], 2)
    return dict(sorted(totals.items(), key=lambda x: x[1], reverse=True))


def _compute_runway(savings_amount: float, total_expenses: float) -> float:
    """
    Runway = how many months savings would cover expenses.
    Capped at 24 months for display purposes.
    """
    if total_expenses <= 0:
        return 24.0
    return round(min(savings_amount / total_expenses, 24.0), 1)