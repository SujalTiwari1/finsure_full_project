from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from services.risk_service import compute_risk_score
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


# ── Request / Response Schemas ─────────────────────────────────
class Transaction(BaseModel):
    date:        str
    description: str
    amount:      float
    type:        str
    category:    str | None = None


class RiskScoreRequest(BaseModel):
    income:       float = Field(..., gt=0, description="Monthly income in ₹")
    dependents:   int   = Field(..., ge=0, description="Number of dependents")
    transactions: list[Transaction]


# ── Route ──────────────────────────────────────────────────────
@router.post("/")
def get_risk_score(request: RiskScoreRequest, app_request: Request):
    """
    Computes the Financial Risk Index (FRI) from categorized transactions.

    - Input:  monthly income, dependents count, categorized transactions
    - Output: FRI score (0–100), risk level, component breakdown
    """
    if not request.transactions:
        raise HTTPException(status_code=400, detail="No transactions provided.")

    try:
        risk_artifact = app_request.app.state.risk_model
    except AttributeError:
        raise HTTPException(
            status_code=503,
            detail="Risk model not loaded. Ensure training has been run."
        )

    txn_dicts = [t.model_dump() for t in request.transactions]

    result = compute_risk_score(
        transactions=txn_dicts,
        income=request.income,
        dependents=request.dependents,
        risk_artifact=risk_artifact,
    )

    return {
        "success":    True,
        "fri_score":  result["fri_score"],
        "risk_level": result["risk_level"],
        "features":   result["features"],
        "breakdown":  result["breakdown"],
    }