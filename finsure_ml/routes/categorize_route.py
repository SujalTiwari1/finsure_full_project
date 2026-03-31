from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services.categorizer_service import categorize_transactions
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


# ── Request / Response Schemas ────────────────────────────
class Transaction(BaseModel):
    date:        str
    description: str
    amount:      float
    type:        str
    category:    str | None = None


class CategorizeRequest(BaseModel):
    transactions: list[Transaction]


# ── Route ─────────────────────────────────────────────────
@router.post("/")
def categorize(request: CategorizeRequest, app_request: Request):
    """
    Takes a list of transactions and returns them with categories assigned.

    - Input:  list of transaction objects
    - Output: same list with 'category' field populated
    """
    if not request.transactions:
        raise HTTPException(status_code=400, detail="No transactions provided.")

    try:
        pipeline = app_request.app.state.categorizer
        le       = app_request.app.state.label_encoder
    except AttributeError:
        raise HTTPException(
            status_code=503,
            detail="Categorizer model not loaded. Ensure training has been run."
        )

    txn_dicts = [t.model_dump() for t in request.transactions]

    categorized = categorize_transactions(txn_dicts, pipeline, le)

    return {
        "success":      True,
        "total":        len(categorized),
        "transactions": categorized,
    }