import re
import pdfplumber
from io import BytesIO
from utils.logger import get_logger

logger = get_logger(__name__)

# ──────────────────────────────────────────
#  Regex patterns
# ──────────────────────────────────────────

# Matches dates like 01/03/2024 or 01-03-2024
DATE_PATTERN = re.compile(r"\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b")

# Matches amounts like 1,23,456.78 or 50000.00
AMOUNT_PATTERN = re.compile(r"[\d,]+\.\d{2}")


def _clean_amount(value: str) -> float:
    """Remove commas and convert to float. Returns 0.0 if empty."""
    if not value or not value.strip():
        return 0.0
    return float(value.replace(",", "").strip())


def _parse_row(row: list) -> dict | None:
    """
    Try to extract a transaction from a table row.
    Expected columns: [Date, Description, Debit, Credit, Balance]
    Returns None if the row doesn't look like a transaction.
    """
    # Filter out None cells
    row = [str(cell).strip() if cell else "" for cell in row]

    if len(row) < 4:
        return None

    # First cell must look like a date
    if not DATE_PATTERN.match(row[0]):
        return None

    date        = row[0]
    description = row[1] if len(row) > 1 else ""
    debit       = _clean_amount(row[2]) if len(row) > 2 else 0.0
    credit      = _clean_amount(row[3]) if len(row) > 3 else 0.0

    # Skip rows with no money movement
    if debit == 0.0 and credit == 0.0:
        return None

    # Determine transaction type
    if debit > 0:
        txn_type = "debit"
        amount   = debit
    else:
        txn_type = "credit"
        amount   = credit

    return {
        "date":        date,
        "description": description.upper().strip(),
        "amount":      amount,
        "type":        txn_type,
    }


def extract_transactions_from_pdf(file: BytesIO) -> list[dict]:
    """
    Main extractor. Accepts a file-like object (PDF bytes).
    Returns a list of raw transaction dicts.
    """
    transactions = []

    try:
        with pdfplumber.open(file) as pdf:
            logger.info(f"📄 Opened PDF — {len(pdf.pages)} page(s) found")

            for page_num, page in enumerate(pdf.pages, start=1):
                tables = page.extract_tables()

                if not tables:
                    logger.debug(f"  Page {page_num}: no tables found, skipping")
                    continue

                logger.debug(f"  Page {page_num}: {len(tables)} table(s) found")

                for table in tables:
                    for row in table:
                        parsed = _parse_row(row)
                        if parsed:
                            transactions.append(parsed)

    except Exception as e:
        logger.error(f"❌ Failed to extract PDF: {e}")
        raise ValueError(f"PDF extraction failed: {str(e)}")

    logger.info(f"✅ Extracted {len(transactions)} transactions")
    return transactions