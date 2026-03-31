from fastapi import APIRouter, UploadFile, File, HTTPException
from services.parser_service import parse_bank_statement
from utils.logger import get_logger
import io

router = APIRouter()
logger = get_logger(__name__)

ALLOWED_CONTENT_TYPES = {"application/pdf", "application/octet-stream"}
MAX_FILE_SIZE_MB = 10


@router.post("/")
async def parse_statement(file: UploadFile = File(...)):
    """
    Upload a bank statement PDF and get back normalized transactions.

    - Accepts: PDF file (max 10MB)
    - Returns: list of transactions + summary stats
    """

    # ── Validate file type ──
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Only PDFs are accepted.",
        )

    # ── Read file bytes ──
    contents = await file.read()

    # ── Validate file size ──
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f}MB). Max allowed is {MAX_FILE_SIZE_MB}MB.",
        )

    logger.info(f"📥 Received file: {file.filename} ({size_mb:.2f}MB)")

    # ── Parse ──
    try:
        result = parse_bank_statement(io.BytesIO(contents))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during parsing: {e}")
        raise HTTPException(status_code=500, detail="Internal error during PDF processing.")

    return {
        "success":            True,
        "filename":           file.filename,
        "total_transactions": result["total_transactions"],
        "total_credits":      result["total_credits"],
        "total_debits":       result["total_debits"],
        "transactions":       result["transactions"],
    }