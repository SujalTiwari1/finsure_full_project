import os

# ──────────────────────────────────────────
#  Transaction Categories
# ──────────────────────────────────────────
CATEGORIES = [
    "rent",
    "groceries",
    "emi",
    "dining",
    "utilities",
    "medical",
    "entertainment",
    "travel",
    "shopping",
    "salary",
    "transfer",
    "other",
]

# ──────────────────────────────────────────
#  Supported Banks
# ──────────────────────────────────────────
SUPPORTED_BANKS = ["hdfc", "sbi", "icici", "axis", "kotak"]

# ──────────────────────────────────────────
#  FRI Risk Thresholds
# ──────────────────────────────────────────
FRI_LOW_MAX    = 30   # 0  – 30  → Low Risk
FRI_MEDIUM_MAX = 70   # 31 – 70  → Medium Risk
                      # 71 – 100 → High Risk

def get_risk_level(score: float) -> str:
    if score <= FRI_LOW_MAX:
        return "Low"
    elif score <= FRI_MEDIUM_MAX:
        return "Medium"
    return "High"

# ──────────────────────────────────────────
#  Insurance Multipliers (rule-based engine)
# ──────────────────────────────────────────
TERM_INSURANCE_MULTIPLIER   = 15         # income × 15
MIN_HEALTH_COVER            = 500_000    # ₹5L
STANDARD_HEALTH_COVER       = 1_000_000  # ₹10L
HIGH_HEALTH_COVER           = 2_000_000  # ₹20L

# ──────────────────────────────────────────
#  Model Paths (always absolute, regardless
#  of where the server is launched from)
# ──────────────────────────────────────────
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ml-service/

CATEGORIZER_MODEL_PATH = os.path.join(_ROOT, "models", "categorizer.pkl")
LABEL_ENCODER_PATH     = os.path.join(_ROOT, "models", "label_encoder.pkl")
RISK_MODEL_PATH        = os.path.join(_ROOT, "models", "risk_model.pkl")