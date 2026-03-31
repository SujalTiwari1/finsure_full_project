from utils.pdf_extractor import extract_transactions_from_pdf
from utils.logger import get_logger
from io import BytesIO

logger = get_logger(__name__)


def _normalize_date(date_str: str) -> str:
    """
    Normalize date to YYYY-MM-DD regardless of input format.
    Handles: DD/MM/YYYY and DD-MM-YYYY
    """
    date_str = date_str.strip().replace("-", "/")
    parts = date_str.split("/")

    if len(parts) != 3:
        return date_str  # return as-is if unexpected format

    day, month, year = parts
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


def _normalize_description(desc: str) -> str:
    """Remove extra whitespace and uppercase."""
    return " ".join(desc.upper().split())


def parse_bank_statement(file: BytesIO) -> dict:
    """
    Full pipeline: extract → normalize → return summary.

    Returns:
    {
        "transactions": [...],
        "total_transactions": int,
        "total_credits": float,
        "total_debits": float,
    }
    """
    raw_transactions = extract_transactions_from_pdf(file)

    normalized = []
    for txn in raw_transactions:
        normalized.append({
            "date":        _normalize_date(txn["date"]),
            "description": _normalize_description(txn["description"]),
            "amount":      txn["amount"],
            "type":        txn["type"],
            "category":    None,  # filled in Phase 3 by categorizer
        })

    total_credits = sum(t["amount"] for t in normalized if t["type"] == "credit")
    total_debits  = sum(t["amount"] for t in normalized if t["type"] == "debit")

    logger.info(
        f"💰 Parsed {len(normalized)} txns | "
        f"Credits: ₹{total_credits:,.2f} | Debits: ₹{total_debits:,.2f}"
    )

    return {
        "transactions":       normalized,
        "total_transactions": len(normalized),
        "total_credits":      round(total_credits, 2),
        "total_debits":       round(total_debits, 2),
    }