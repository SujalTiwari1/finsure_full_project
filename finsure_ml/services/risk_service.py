import joblib
import numpy as np
from utils.constants import RISK_MODEL_PATH, get_risk_level
from utils.logger import get_logger

logger = get_logger(__name__)


def load_risk_model() -> dict:
    """
    Loads the XGBoost risk model from disk.
    Called once at startup via lifespan in main.py.
    """
    try:
        artifact = joblib.load(RISK_MODEL_PATH)
        logger.info("✅ Risk model loaded successfully")
        return artifact
    except FileNotFoundError:
        logger.error(
            "❌ Risk model not found. "
            "Run: python services/training/train_risk_model.py"
        )
        raise


def _extract_features(
    transactions: list[dict],
    income: float,
    dependents: int,
    existing_term: float = 0.0,
    existing_health: float = 0.0,
) -> dict:
    """
    Derives model input features from categorized transactions + profile.
    """
    emi_amount    = sum(t["amount"] for t in transactions if t.get("category") == "emi"        and t["type"] == "debit")
    medical_spend = sum(t["amount"] for t in transactions if t.get("category") == "medical"    and t["type"] == "debit")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "debit")

    # Guard: avoid divide-by-zero
    if income <= 0:
        income = 1

    savings_amount = max(income - total_expenses, 0)
    savings_rate   = round(savings_amount / income, 4)
    emi_ratio      = round(min(emi_amount  / income, 1.0), 4)
    medical_ratio  = round(min(medical_spend / income, 1.0), 4)

    return {
        "income":         income,
        "total_expenses": round(total_expenses, 2),
        "emi_amount":     round(emi_amount, 2),
        "savings_amount": round(savings_amount, 2),
        "medical_spend":  round(medical_spend, 2),
        "emi_ratio":      emi_ratio,
        "savings_rate":   savings_rate,
        "medical_ratio":  medical_ratio,
        "dependents":     dependents,
        "existing_term":  existing_term,
        "existing_health": existing_health,
    }


def _component_breakdown(features: dict) -> dict:
    """
    Returns a human-readable breakdown of each FRI component.
    Mirrors the scoring logic used during training.
    """
    savings_rate  = features["savings_rate"]
    emi_ratio     = features["emi_ratio"]
    dependents    = features["dependents"]
    medical_ratio = features["medical_ratio"]

    # Cash Flow Risk
    if savings_rate < 0.05:
        cash_flow = {"score": 30, "label": "Critical", "message": "Savings below 5% of income"}
    elif savings_rate < 0.15:
        cash_flow = {"score": 20, "label": "High",     "message": "Savings between 5–15% of income"}
    elif savings_rate < 0.25:
        cash_flow = {"score": 10, "label": "Medium",   "message": "Savings between 15–25% of income"}
    else:
        cash_flow = {"score": 0,  "label": "Low",      "message": "Savings above 25% — healthy"}

    # EMI Stress
    if emi_ratio > 0.5:
        emi = {"score": 30, "label": "Critical", "message": "EMIs exceed 50% of income"}
    elif emi_ratio > 0.35:
        emi = {"score": 20, "label": "High",     "message": "EMIs between 35–50% of income"}
    elif emi_ratio > 0.2:
        emi = {"score": 10, "label": "Medium",   "message": "EMIs between 20–35% of income"}
    else:
        emi = {"score": 0,  "label": "Low",      "message": "EMI burden is manageable"}

    # Family Exposure
    if dependents >= 3 and savings_rate < 0.2:
        family = {"score": 20, "label": "High",   "message": "3+ dependents with low savings"}
    elif dependents >= 2 and savings_rate < 0.15:
        family = {"score": 15, "label": "Medium", "message": "2+ dependents with limited savings"}
    elif dependents >= 1:
        family = {"score": 8,  "label": "Low",    "message": "Dependents present — some exposure"}
    else:
        family = {"score": 0,  "label": "None",   "message": "No dependents"}

    # Coverage Gap
    if medical_ratio > 0.1:
        coverage = {"score": 20, "label": "Critical", "message": "Medical spend exceeds 10% of income"}
    elif medical_ratio > 0.05:
        coverage = {"score": 12, "label": "High",     "message": "Medical spend between 5–10% of income"}
    elif medical_ratio > 0.02:
        coverage = {"score": 5,  "label": "Medium",   "message": "Some medical expenses detected"}
    else:
        coverage = {"score": 0,  "label": "Low",      "message": "Low medical spend"}

    return {
        "cash_flow_risk":  cash_flow,
        "emi_stress":      emi,
        "family_exposure": family,
        "coverage_gap":    coverage,
    }


def compute_risk_score(
    transactions: list[dict],
    income: float,
    dependents: int,
    risk_artifact: dict,
    existing_term: float = 0.0,
    existing_health: float = 0.0,
) -> dict:
    """
    Full pipeline: extract features → predict FRI → return result with breakdown.

    Returns:
    {
        "fri_score":   72.0,
        "risk_level":  "High",
        "features":    { ... },
        "breakdown":   { ... },
    }
    """
    model    = risk_artifact["model"]
    features = risk_artifact["features"]

    extracted = _extract_features(transactions, income, dependents, existing_term, existing_health)

    # Build input in the exact feature order the model was trained on
    X = np.array([[extracted[f] for f in features]])

    raw_score = float(model.predict(X)[0])
    fri_score = round(min(max(raw_score, 0), 100), 1)

    # ── Adjustment for Existing Insurance ──
    reduction = 0.0
    
    # 1. Term Insurance (max 15 points deduction)
    annual_income = income * 12
    if annual_income > 0 and existing_term > 0:
        term_ratio = existing_term / annual_income
        reduction += min(15.0, (term_ratio / 10.0) * 15.0)
        
    # 2. Health Insurance (max 10 points deduction)
    if existing_health > 0:
        reduction += min(10.0, (existing_health / 500_000.0) * 10.0)

    # Apply reduction and recap at 0-100 bounds
    fri_score = round(max(fri_score - reduction, 0.0), 1)
    risk_level = get_risk_level(fri_score)

    breakdown = _component_breakdown(extracted)

    logger.info(f"🎯 FRI Score: {fri_score} | Risk Level: {risk_level}")

    return {
        "fri_score":  fri_score,
        "risk_level": risk_level,
        "features":   extracted,
        "breakdown":  breakdown,
    }