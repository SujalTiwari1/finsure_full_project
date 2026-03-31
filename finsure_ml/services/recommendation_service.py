"""
Recommendation Engine — IRDAI-backed hybrid rule model.

Standards used:
  - IRDAI: Term cover = 15× annual income (base), age-adjusted
  - IRDAI: Health cover minimum = ₹5L per person
  - IRDAI: Critical Illness rider for age > 40
  - SEBI:  EMI burden should not exceed 40% of income
  - SEBI:  Savings rate minimum 20% (50-30-20 rule)
  - Standard: 6-month emergency fund
"""

from utils.constants import (
    TERM_INSURANCE_MULTIPLIER,
    MIN_HEALTH_COVER,
    STANDARD_HEALTH_COVER,
    HIGH_HEALTH_COVER,
)
from utils.logger import get_logger

logger = get_logger(__name__)

# ── IRDAI / SEBI Constants ─────────────────────────────────────
METRO_CITIES         = {"mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai", "pune", "kolkata"}
MAX_HEALTH_COVER     = 2_500_000   # ₹25L cap
HEALTH_PER_DEPENDENT = 500_000     # ₹5L per dependent
HIGH_FRI_MULTIPLIER  = 20          # 20× annual income for high risk
LOW_FRI_MULTIPLIER   = 10          # 10× for no dependents
SAFE_EMI_THRESHOLD   = 0.40        # SEBI: EMI should not exceed 40%
SAFE_SAVINGS_RATE    = 0.20        # SEBI: minimum 20% savings


# ──────────────────────────────────────────────────────────────
#  Input Validation
# ──────────────────────────────────────────────────────────────

def _validate_inputs(income: float, age: int):
    if income <= 0:
        raise ValueError("Income must be greater than 0")
    if not (18 <= age <= 70):
        raise ValueError("Age must be between 18 and 70 for insurance eligibility")


# ──────────────────────────────────────────────────────────────
#  Age-Adjusted Multiplier (IRDAI)
# ──────────────────────────────────────────────────────────────

def _age_adjusted_multiplier(age: int, base_multiplier: int) -> int:
    """
    IRDAI factors in remaining working years.
    Younger users need more cover (longer dependence period).
    """
    if age < 30:
        return base_multiplier           # full multiplier
    elif age < 40:
        return base_multiplier - 2       # slightly reduced
    elif age < 50:
        return base_multiplier - 4       # moderate reduction
    else:
        return max(base_multiplier - 6, 5)  # floor at 5×


# ──────────────────────────────────────────────────────────────
#  Term Insurance Recommendation
# ──────────────────────────────────────────────────────────────

def _recommend_term(
    income: float,
    age: int,
    dependents: int,
    fri_score: float,
    existing_term: float,
) -> dict:
    """
    IRDAI standard: 15× annual income base, age-adjusted.
    Bumped to 20× for high FRI, reduced to 10× for no dependents.
    """
    annual_income   = income * 12
    suggested_tenure = max(60 - age, 10)  # retire at 60, min 10yr policy

    if dependents == 0:
        base_multiplier = LOW_FRI_MULTIPLIER
        reason = "No dependents — 10× annual income (IRDAI minimum)"
    elif fri_score >= 70:
        base_multiplier = HIGH_FRI_MULTIPLIER
        reason = "High FRI score — 20× annual income (IRDAI high-risk advisory)"
    else:
        base_multiplier = TERM_INSURANCE_MULTIPLIER
        reason = "Standard — 15× annual income (IRDAI base standard)"

    # Apply age adjustment
    final_multiplier = _age_adjusted_multiplier(age, base_multiplier)
    required_cover   = annual_income * final_multiplier
    gap              = max(required_cover - existing_term, 0)
    adequacy_pct     = round((existing_term / required_cover) * 100, 1) if required_cover > 0 else 100.0

    # Note if multiplier was age-adjusted
    if final_multiplier != base_multiplier:
        reason += f" (reduced from {base_multiplier}× to {final_multiplier}× due to age {age})"

    return {
        "required_cover":   required_cover,
        "existing_cover":   existing_term,
        "gap":              gap,
        "multiplier_used":  final_multiplier,
        "suggested_tenure": suggested_tenure,
        "adequacy_pct":     adequacy_pct,
        "is_adequate":      gap == 0,
        "reason":           reason,
        "irdai_reference":  f"IRDAI recommends {final_multiplier}× annual income for age {age} profile",
    }


# ──────────────────────────────────────────────────────────────
#  Health Insurance Recommendation
# ──────────────────────────────────────────────────────────────

def _recommend_health(
    income: float,
    age: int,
    city: str,
    dependents: int,
    fri_score: float,
    fri_breakdown: dict,
    existing_health: float,
) -> dict:
    """
    IRDAI standard: ₹5L minimum per person.
    Adjusted for metro city, age, FRI score, and dependents.
    """
    reasons    = []
    base_cover = MIN_HEALTH_COVER   # ₹5L IRDAI base

    # Rule 1: Metro city bump
    is_metro = city.lower().strip() in METRO_CITIES
    if is_metro:
        base_cover = STANDARD_HEALTH_COVER
        reasons.append(f"Metro city ({city.title()}) — IRDAI recommends ₹10L minimum")

    # Rule 2: Age > 35 bump
    if age > 35:
        base_cover = max(base_cover, STANDARD_HEALTH_COVER)
        reasons.append("Age > 35 — higher hospitalisation risk, ₹10L recommended")

    # Rule 3: High FRI + high medical spend
    coverage_gap_score = fri_breakdown.get("coverage_gap", {}).get("score", 0)
    if fri_score >= 70 and coverage_gap_score >= 12:
        base_cover = HIGH_HEALTH_COVER
        reasons.append("High FRI + significant medical spend — ₹20L cover advised")

    # Rule 4: Family floater — ₹5L per dependent, capped at ₹25L
    dependent_add  = min(dependents * HEALTH_PER_DEPENDENT, MAX_HEALTH_COVER - base_cover)
    required_cover = min(base_cover + dependent_add, MAX_HEALTH_COVER)
    if dependents > 0:
        reasons.append(
            f"{dependents} dependent(s) — adding ₹{dependent_add//100_000}L for family floater"
        )

    if not reasons:
        reasons.append("IRDAI base standard — ₹5L minimum cover per person")

    gap          = max(required_cover - existing_health, 0)
    adequacy_pct = round((existing_health / required_cover) * 100, 1) if required_cover > 0 else 100.0

    return {
        "required_cover":  required_cover,
        "existing_cover":  existing_health,
        "gap":             gap,
        "adequacy_pct":    adequacy_pct,
        "is_adequate":     gap == 0,
        "is_metro":        is_metro,
        "reasons":         reasons,
        "irdai_reference": "IRDAI Circular: Minimum ₹5L health cover per person (enhanced for risk profile)",
    }


# ──────────────────────────────────────────────────────────────
#  Critical Illness Rider (IRDAI — age > 40)
# ──────────────────────────────────────────────────────────────

def _recommend_critical_illness(age: int, income: float) -> dict | None:
    """
    IRDAI recommends a Critical Illness rider for individuals above 40.
    Cover is typically 10× monthly income, minimum ₹10L.
    """
    if age <= 40:
        return None

    suggested_cover = max(income * 10, 1_000_000)   # 10× monthly or ₹10L min

    return {
        "recommended":     True,
        "suggested_cover": suggested_cover,
        "reason":          f"Age {age} > 40 — IRDAI recommends Critical Illness rider",
        "covers":          ["Cancer", "Heart Attack", "Stroke", "Kidney Failure", "Major Organ Transplant"],
        "irdai_reference": "IRDAI Health Insurance Regulations — CI rider for age > 40",
    }


# ──────────────────────────────────────────────────────────────
#  Accidental Death Benefit Rider
# ──────────────────────────────────────────────────────────────

def _recommend_adb_rider(dependents: int, income: float) -> dict | None:
    """
    IRDAI recommends Accidental Death Benefit rider for salaried
    professionals with dependents and income below ₹50,000/month.
    """
    if dependents == 0 or income >= 50_000:
        return None

    return {
        "recommended":     True,
        "suggested_cover": income * 12 * 10,   # 10× annual income
        "reason":          "Dependents present + income < ₹50K — ADB rider recommended",
        "irdai_reference": "IRDAI — Accidental Death Benefit rider for income protection",
    }


# ──────────────────────────────────────────────────────────────
#  Priority Actions (SEBI 50-30-20 Rule)
# ──────────────────────────────────────────────────────────────

def _priority_actions(features: dict, fri_score: float) -> list[dict]:
    """
    Prioritized financial actions based on SEBI planning standards.
    """
    actions      = []
    savings_rate = features.get("savings_rate", 0)
    emi_ratio    = features.get("emi_ratio", 0)
    income       = features.get("income", 0)
    expenses     = features.get("total_expenses", 0)

    # Critical: High FRI — insurance is most urgent
    if fri_score >= 70:
        actions.append({
            "priority":  "Critical",
            "category":  "Insurance",
            "action":    "Purchase term and health insurance immediately",
            "detail":    f"Your FRI score of {fri_score} signals high financial risk. "
                         f"Insurance is your most urgent protection layer.",
            "reference": "IRDAI — Insurance as first line of financial protection",
        })

    # High: EMI burden above SEBI threshold
    if emi_ratio > SAFE_EMI_THRESHOLD:
        excess_pct = round((emi_ratio - SAFE_EMI_THRESHOLD) * 100, 1)
        actions.append({
            "priority":  "High",
            "category":  "Debt Management",
            "action":    f"Reduce EMI burden — currently {round(emi_ratio*100,1)}% of income",
            "detail":    f"Your EMIs exceed the SEBI-recommended 40% threshold by {excess_pct}%. "
                         f"Consider prepaying high-interest loans first.",
            "reference": "SEBI Financial Planning Guidelines — 50-30-20 Rule",
        })

    # High: Savings rate below SEBI threshold
    if savings_rate < SAFE_SAVINGS_RATE:
        shortfall = round((SAFE_SAVINGS_RATE - savings_rate) * income)
        actions.append({
            "priority":  "High",
            "category":  "Savings",
            "action":    f"Increase monthly savings by ₹{shortfall:,}",
            "detail":    f"Current savings rate is {round(savings_rate*100,1)}%. "
                         f"SEBI recommends saving at least 20% of monthly income.",
            "reference": "SEBI 50-30-20 Rule — 20% mandatory savings",
        })

    # Medium: Emergency fund
    emergency_target = expenses * 6
    actions.append({
        "priority":  "Medium",
        "category":  "Emergency Fund",
        "action":    f"Build emergency fund of ₹{emergency_target:,.0f}",
        "detail":    f"Keep 6 months of expenses (₹{expenses:,.0f}/month) "
                     f"in a liquid instrument like a savings account or liquid mutual fund.",
        "reference": "Standard financial planning — 6-month emergency buffer",
    })

    return actions


# ──────────────────────────────────────────────────────────────
#  Main Entry Point
# ──────────────────────────────────────────────────────────────

def generate_recommendations(
    income: float,
    age: int,
    city: str,
    dependents: int,
    fri_score: float,
    fri_breakdown: dict,
    features: dict,
    existing_term: float   = 0,
    existing_health: float = 0,
) -> dict:
    """
    Generates full IRDAI-backed insurance recommendations.

    Returns:
    {
        "term_insurance":      { required, gap, tenure, reason, ... },
        "health_insurance":    { required, gap, reasons, ... },
        "critical_illness":    { ... } | None,
        "adb_rider":           { ... } | None,
        "priority_actions":    [ { priority, action, detail, reference }, ... ],
        "overall_priority":    "Critical" | "High" | "Medium" | "Low",
        "summary":             "...",
    }
    """
    _validate_inputs(income, age)

    term             = _recommend_term(income, age, dependents, fri_score, existing_term)
    health           = _recommend_health(income, age, city, dependents, fri_score, fri_breakdown, existing_health)
    critical_illness = _recommend_critical_illness(age, income)
    adb_rider        = _recommend_adb_rider(dependents, income)
    actions          = _priority_actions(features, fri_score)

    # Overall priority
    has_gaps = term["gap"] > 0 or health["gap"] > 0
    if fri_score >= 70 or (has_gaps and fri_score >= 50):
        overall_priority = "Critical"
    elif fri_score >= 50 or has_gaps:
        overall_priority = "High"
    elif fri_score >= 30:
        overall_priority = "Medium"
    else:
        overall_priority = "Low"

    # Human-readable summary
    term_cr  = term["required_cover"]  / 10_000_000
    health_l = health["required_cover"] / 100_000

    summary = (
        f"Based on IRDAI standards, you need ₹{term_cr:.1f}Cr term cover "
        f"and ₹{health_l:.0f}L health cover. "
    )

    if has_gaps:
        term_gap_cr  = term["gap"]   / 10_000_000
        health_gap_l = health["gap"] / 100_000
        summary += (
            f"You are currently underinsured by "
            f"₹{term_gap_cr:.1f}Cr in term and ₹{health_gap_l:.0f}L in health coverage."
        )
    else:
        summary += "Your current coverage meets IRDAI recommended standards."

    logger.info(f"📋 Recommendations generated | Priority: {overall_priority} | FRI: {fri_score}")

    return {
        "term_insurance":   term,
        "health_insurance": health,
        "critical_illness": critical_illness,
        "adb_rider":        adb_rider,
        "priority_actions": actions,
        "overall_priority": overall_priority,
        "summary":          summary,
    }