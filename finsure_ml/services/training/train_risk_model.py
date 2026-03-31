"""
Trains the FRI (Financial Risk Index) scoring model.

Run once from the ml-service root:
    python services/training/train_risk_model.py

Output:
    models/risk_model.pkl
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

from utils.logger import get_logger

logger = get_logger(__name__)


# ──────────────────────────────────────────────────────────────
#  FRI Scoring Logic (used to label synthetic data)
#
#  Each component contributes to the final score:
#   - Cash Flow Risk    : how little is saved
#   - EMI Stress        : loan burden vs income
#   - Family Exposure   : dependents with no safety net
#   - Coverage Gap      : medical spend without health cover
# ──────────────────────────────────────────────────────────────

def compute_fri_label(row: dict) -> float:
    """
    Rule-based FRI score (0–100) used to label synthetic training data.
    Higher = riskier.
    """
    score = 0.0

    # 1. Cash Flow Risk (0–30)
    #    Low savings rate = high risk
    savings_rate = row["savings_rate"]
    if savings_rate < 0.05:
        score += 30
    elif savings_rate < 0.15:
        score += 20
    elif savings_rate < 0.25:
        score += 10
    else:
        score += 0

    # 2. EMI Stress (0–30)
    #    High EMI-to-income ratio = high risk
    emi_ratio = row["emi_ratio"]
    if emi_ratio > 0.5:
        score += 30
    elif emi_ratio > 0.35:
        score += 20
    elif emi_ratio > 0.2:
        score += 10
    else:
        score += 0

    # 3. Family Exposure (0–20)
    #    More dependents + low savings = higher risk
    dependents = row["dependents"]
    if dependents >= 3 and savings_rate < 0.2:
        score += 20
    elif dependents >= 2 and savings_rate < 0.15:
        score += 15
    elif dependents >= 1:
        score += 8
    else:
        score += 0

    # 4. Coverage Gap (0–20)
    #    High medical spend without adequate cover = high risk
    medical_ratio = row["medical_ratio"]
    if medical_ratio > 0.1:
        score += 20
    elif medical_ratio > 0.05:
        score += 12
    elif medical_ratio > 0.02:
        score += 5
    else:
        score += 0

    return min(round(score, 2), 100.0)


# ──────────────────────────────────────────────────────────────
#  Synthetic Dataset Generation
# ──────────────────────────────────────────────────────────────

def generate_dataset(n: int = 1200) -> pd.DataFrame:
    np.random.seed(42)
    records = []

    for _ in range(n):
        income = np.random.choice([
            np.random.randint(20000,  40000),   # lower-middle class
            np.random.randint(40000,  80000),   # middle class
            np.random.randint(80000, 150000),   # upper-middle class
        ])

        dependents    = np.random.randint(0, 5)
        emi_ratio     = round(np.random.uniform(0.0, 0.6), 3)
        savings_rate  = round(np.random.uniform(0.0, 0.5), 3)
        medical_ratio = round(np.random.uniform(0.0, 0.15), 3)

        emi_amount     = income * emi_ratio
        savings_amount = income * savings_rate
        medical_spend  = income * medical_ratio
        total_expenses = income - savings_amount

        row = {
            "income":         income,
            "total_expenses": round(total_expenses, 2),
            "emi_amount":     round(emi_amount, 2),
            "savings_amount": round(savings_amount, 2),
            "medical_spend":  round(medical_spend, 2),
            "emi_ratio":      emi_ratio,
            "savings_rate":   savings_rate,
            "medical_ratio":  medical_ratio,
            "dependents":     dependents,
        }

        row["fri_score"] = compute_fri_label(row)
        records.append(row)

    return pd.DataFrame(records)


# ──────────────────────────────────────────────────────────────
#  Train & Save
# ──────────────────────────────────────────────────────────────

FEATURES = [
    "income",
    "total_expenses",
    "emi_amount",
    "savings_amount",
    "medical_spend",
    "emi_ratio",
    "savings_rate",
    "medical_ratio",
    "dependents",
]


def train():
    logger.info("📊 Generating synthetic dataset...")
    df = generate_dataset(1200)

    X = df[FEATURES]
    y = df["fri_score"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=0,
    )

    model.fit(X_train, y_train)

    # ── Evaluation ────────────────────────────────────
    y_pred = model.predict(X_test)
    mae    = mean_absolute_error(y_test, y_pred)
    r2     = r2_score(y_test, y_pred)
    logger.info(f"📈 MAE: {mae:.2f} | R²: {r2:.4f}")

    # ── Save ──────────────────────────────────────────
    os.makedirs("models", exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES}, "models/risk_model.pkl")
    logger.info("✅ Risk model saved to models/risk_model.pkl")


if __name__ == "__main__":
    train()