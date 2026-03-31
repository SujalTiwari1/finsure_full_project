from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from services.analyze_service import run_full_analysis
from utils.logger import get_logger
import io

router = APIRouter()
logger = get_logger(__name__)

MAX_FILE_SIZE_MB      = 10
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/octet-stream"}


@router.post("/")
async def analyze(
    app_request:     Request,
    file:            UploadFile = File(...),
    income:          float = Form(...),
    age:             int   = Form(...),
    city:            str   = Form(...),
    dependents:      int   = Form(...),
    existing_term:   float = Form(default=0),
    existing_health: float = Form(default=0),
):
    """
    🚀 Full pipeline endpoint — Node.js calls this single endpoint.

    Accepts multipart/form-data:
    - file            : bank statement PDF
    - income          : monthly income in ₹
    - age             : user age (18–70)
    - city            : city of residence
    - dependents      : number of dependents
    - existing_term   : existing term cover in ₹ (optional, default 0)
    - existing_health : existing health cover in ₹ (optional, default 0)

    Returns: transactions + cash flow + FRI score + recommendations
    """

    # ── Validate file type ────────────────────────────────────
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only PDFs accepted."
        )

    # ── Read + validate size ──────────────────────────────────
    pdf_bytes = await file.read()
    size_mb   = len(pdf_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f}MB). Max is {MAX_FILE_SIZE_MB}MB."
        )

    # ── Validate form fields ──────────────────────────────────
    if not (18 <= age <= 70):
        raise HTTPException(status_code=400, detail="Age must be between 18 and 70.")
    if income <= 0:
        raise HTTPException(status_code=400, detail="Income must be greater than 0.")
    if dependents < 0:
        raise HTTPException(status_code=400, detail="Dependents cannot be negative.")

    # ── Load models from app state ────────────────────────────
    try:
        categorizer   = app_request.app.state.categorizer
        label_encoder = app_request.app.state.label_encoder
        risk_artifact = app_request.app.state.risk_model
    except AttributeError:
        raise HTTPException(status_code=503, detail="Models not loaded. Check server startup logs.")

    logger.info(
        f"📥 /analyze request | income=₹{income:,.0f} | age={age} | "
        f"city={city} | dependents={dependents} | file={file.filename}"
    )

    # ── Run full pipeline ─────────────────────────────────────
    try:
        result = run_full_analysis(
            pdf_bytes       = pdf_bytes,
            income          = income,
            age             = age,
            city            = city,
            dependents      = dependents,
            existing_term   = existing_term,
            existing_health = existing_health,
            categorizer     = categorizer,
            label_encoder   = label_encoder,
            risk_artifact   = risk_artifact,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Pipeline error: {e}")
        raise HTTPException(status_code=500, detail="Internal error during analysis.")

    return {
        "success":  True,
        "filename": file.filename,
        **result,
    }