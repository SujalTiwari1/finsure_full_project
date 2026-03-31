"""
Run this once to generate a dummy bank statement PDF for testing.

Usage:
    python tests/generate_dummy_pdf.py

Output:
    tests/dummy_statement.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
import os

# ── Dummy transactions ──────────────────────────────────────────────────
TRANSACTIONS = [
    # (Date,        Description,                  Debit,    Credit,   Balance)
    ("01/03/2024", "SALARY CREDIT ACME CORP",     "",       "75000.00", "75000.00"),
    ("02/03/2024", "HDFC HOME LOAN EMI",           "22000.00", "",     "53000.00"),
    ("03/03/2024", "SWIGGY ORDER 98712",           "450.00",   "",     "52550.00"),
    ("04/03/2024", "DMART GROCERIES",              "3200.00",  "",     "49350.00"),
    ("05/03/2024", "BESCOM ELECTRICITY BILL",      "1800.00",  "",     "47550.00"),
    ("06/03/2024", "APOLLO PHARMACY",              "950.00",   "",     "46600.00"),
    ("08/03/2024", "ZOMATO ORDER 44521",           "380.00",   "",     "46220.00"),
    ("10/03/2024", "AMAZON SHOPPING",              "2100.00",  "",     "44120.00"),
    ("12/03/2024", "RENT TRANSFER MR SHARMA",      "18000.00", "",     "26120.00"),
    ("14/03/2024", "UBER RIDE",                    "320.00",   "",     "25800.00"),
    ("15/03/2024", "NETFLIX SUBSCRIPTION",         "649.00",   "",     "25151.00"),
    ("16/03/2024", "BIGBASKET GROCERIES",          "1500.00",  "",     "23651.00"),
    ("18/03/2024", "ICICI PERSONAL LOAN EMI",      "8000.00",  "",     "15651.00"),
    ("20/03/2024", "RELIANCE JIO RECHARGE",        "299.00",   "",     "15352.00"),
    ("21/03/2024", "FREELANCE PAYMENT RECEIVED",   "",        "12000.00","27352.00"),
    ("22/03/2024", "STARBUCKS COFFEE",             "620.00",   "",     "26732.00"),
    ("24/03/2024", "MANIPAL HOSPITAL",             "4500.00",  "",     "22232.00"),
    ("26/03/2024", "IRCTC TRAIN TICKET",           "1200.00",  "",     "21032.00"),
    ("28/03/2024", "MYNTRA SHOPPING",              "1899.00",  "",     "19133.00"),
    ("31/03/2024", "ATM WITHDRAWAL",               "5000.00",  "",     "14133.00"),
]


def generate(output_path: str = "tests/dummy_statement.pdf"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    doc    = SimpleDocTemplate(output_path, pagesize=A4,
                               leftMargin=1.5*cm, rightMargin=1.5*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    # ── Header ───────────────────────────────────────────────────────────
    story.append(Paragraph("<b>FINSURE NATIONAL BANK</b>", styles["Title"]))
    story.append(Paragraph("Account Statement — March 2024", styles["Normal"]))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("Account No: XXXX XXXX 4821 &nbsp;&nbsp; IFSC: FNSB0001234", styles["Normal"]))
    story.append(Paragraph("Account Holder: Rahul Sharma &nbsp;&nbsp; Branch: Mumbai - Andheri", styles["Normal"]))
    story.append(Spacer(1, 0.6*cm))

    # ── Table ─────────────────────────────────────────────────────────────
    headers = [["Date", "Description", "Debit (₹)", "Credit (₹)", "Balance (₹)"]]
    data    = headers + [list(row) for row in TRANSACTIONS]

    table = Table(
        data,
        colWidths=[2.8*cm, 8.5*cm, 3*cm, 3*cm, 3*cm],
    )
    table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",   (0, 0), (-1, 0),  colors.HexColor("#1a3c5e")),
        ("TEXTCOLOR",    (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0),  9),
        ("ALIGN",        (0, 0), (-1, 0),  "CENTER"),

        # Body rows
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 1), (-1, -1), 8),
        ("ALIGN",        (2, 1), (-1, -1), "RIGHT"),   # amounts right-aligned
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f8fc")]),

        # Grid
        ("GRID",         (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("BOX",          (0, 0), (-1, -1), 1,   colors.HexColor("#1a3c5e")),

        # Padding
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
    ]))

    story.append(table)
    story.append(Spacer(1, 0.6*cm))
    story.append(Paragraph(
        "<i>This is a system-generated dummy statement for testing purposes only.</i>",
        styles["Normal"]
    ))

    doc.build(story)
    print(f"✅ Dummy PDF generated: {output_path}")
    print(f"   Transactions: {len(TRANSACTIONS)}")


if __name__ == "__main__":
    generate()