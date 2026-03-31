from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.recommendation_service import generate_recommendations
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


# ── Request Schema ─────────────────────────────────────────────
class RecommendationRequest(BaseModel):
    # User profile
    income:     float = Field(..., gt=0,  description="Monthly income in ₹")
    age:        int   = Field(..., ge=18, le=70, description="Age (18–70)")
    city:       str   = Field(..., description="City of residence")
    dependents: int   = Field(..., ge=0,  description="Number of dependents")

    # FRI results (pass directly from /risk-score response)
    fri_score:     float = Field(..., ge=0, le=100)
    fri_breakdown: dict  = Field(..., description="Breakdown dict from /risk-score")
    features:      dict  = Field(..., description="Features dict from /risk-score")

    # Existing coverage (optional — defaults to 0 if user has none)
    existing_term:   float = Field(default=0, ge=0, description="Existing term cover in ₹")
    existing_health: float = Field(default=0, ge=0, description="Existing health cover in ₹")


# ── Route ──────────────────────────────────────────────────────
@router.post("/")
def recommend(request: RecommendationRequest):
    """
    Generates IRDAI-backed insurance recommendations from FRI results.

    - Input:  user profile + fri_score + fri_breakdown + features (from /risk-score)
    - Output: term cover, health cover, CI rider, ADB rider, priority actions
    """
    try:
        result = generate_recommendations(
            income          = request.income,
            age             = request.age,
            city            = request.city,
            dependents      = request.dependents,
            fri_score       = request.fri_score,
            fri_breakdown   = request.fri_breakdown,
            features        = request.features,
            existing_term   = request.existing_term,
            existing_health = request.existing_health,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail="Internal error during recommendation generation.")

    return {
        "success": True,
        **result,
    }