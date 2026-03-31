"""
Trains the transaction categorization model.

Run once from the ml-service root:
    python services/training/train_categorizer.py

Output:
    models/categorizer.pkl
    models/label_encoder.pkl
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

import joblib
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from utils.text_cleaner import clean_description
from utils.logger import get_logger

logger = get_logger(__name__)

# ──────────────────────────────────────────
#  Synthetic Training Data
#  Format: (description, category)
# ──────────────────────────────────────────
RAW_DATA = [
    # ── RENT ──────────────────────────────
    ("RENT TRANSFER MR SHARMA",               "rent"),
    ("HOUSE RENT PAYMENT",                    "rent"),
    ("RENT PAID LANDLORD",                    "rent"),
    ("MONTHLY RENT CREDIT",                   "rent"),
    ("FLAT RENT MUMBAI",                      "rent"),
    ("RENT MRS PATEL",                        "rent"),
    ("ACCOMODATION RENT",                     "rent"),
    ("RENTAL PAYMENT SOCIETY",                "rent"),
    ("ROOM RENT PAYMENT",                     "rent"),
    ("PG RENT BANGALORE",                     "rent"),

    # ── GROCERIES ─────────────────────────
    ("DMART GROCERIES",                       "groceries"),
    ("BIGBASKET ORDER",                       "groceries"),
    ("GROFERS DELIVERY",                      "groceries"),
    ("RELIANCE FRESH",                        "groceries"),
    ("NATURE BASKET",                         "groceries"),
    ("MORE SUPERMARKET",                      "groceries"),
    ("GROCERY STORE PAYMENT",                 "groceries"),
    ("VEGETABLES PURCHASE",                   "groceries"),
    ("MILK DAIRY PRODUCTS",                   "groceries"),
    ("SPENCERS SUPERMARKET",                  "groceries"),
    ("BLINKIT GROCERIES",                     "groceries"),
    ("ZEPTO GROCERY ORDER",                   "groceries"),
    ("SWIGGY INSTAMART",                      "groceries"),
    ("FRESH VEGETABLES MARKET",               "groceries"),
    ("DAILY GROCERY STORE",                   "groceries"),

    # ── EMI ───────────────────────────────
    ("HDFC HOME LOAN EMI",                    "emi"),
    ("ICICI PERSONAL LOAN EMI",               "emi"),
    ("SBI CAR LOAN EMI",                      "emi"),
    ("BAJAJ FINSERV EMI",                     "emi"),
    ("AXIS BANK LOAN EMI",                    "emi"),
    ("EMI DEBIT AUTO",                        "emi"),
    ("LOAN REPAYMENT HDFC",                   "emi"),
    ("KOTAK MAHINDRA LOAN",                   "emi"),
    ("HOME LOAN INSTALLMENT",                 "emi"),
    ("VEHICLE LOAN EMI",                      "emi"),
    ("TATA CAPITAL EMI",                      "emi"),
    ("CREDIT CARD EMI PAYMENT",               "emi"),
    ("EDUCATION LOAN EMI",                    "emi"),
    ("HDFC BANK LOAN DEBIT",                  "emi"),
    ("TWO WHEELER LOAN EMI",                  "emi"),

    # ── DINING ────────────────────────────
    ("SWIGGY ORDER",                          "dining"),
    ("ZOMATO ORDER",                          "dining"),
    ("RESTAURANT PAYMENT",                    "dining"),
    ("STARBUCKS COFFEE",                      "dining"),
    ("MCDONALDS INDIA",                       "dining"),
    ("DOMINOS PIZZA",                         "dining"),
    ("CAFE COFFEE DAY",                       "dining"),
    ("HOTEL FOOD PAYMENT",                    "dining"),
    ("BARBEQUE NATION",                       "dining"),
    ("BURGER KING INDIA",                     "dining"),
    ("KFC PAYMENT",                           "dining"),
    ("SUBWAY INDIA",                          "dining"),
    ("DINNER PAYMENT RESTAURANT",             "dining"),
    ("LUNCH CANTEEN",                         "dining"),
    ("PIZZA HUT ORDER",                       "dining"),

    # ── UTILITIES ─────────────────────────
    ("BESCOM ELECTRICITY BILL",               "utilities"),
    ("MSEB BILL PAYMENT",                     "utilities"),
    ("BSES POWER BILL",                       "utilities"),
    ("GAS CYLINDER BOOKING",                  "utilities"),
    ("MAHANAGAR GAS",                         "utilities"),
    ("WATER BILL PAYMENT",                    "utilities"),
    ("RELIANCE JIO RECHARGE",                 "utilities"),
    ("AIRTEL POSTPAID BILL",                  "utilities"),
    ("VODAFONE BILL",                         "utilities"),
    ("BSNL LANDLINE BILL",                    "utilities"),
    ("TATA SKY RECHARGE",                     "utilities"),
    ("DISH TV SUBSCRIPTION",                  "utilities"),
    ("MOBILE RECHARGE",                       "utilities"),
    ("INTERNET BILL PAYMENT",                 "utilities"),
    ("ACT BROADBAND BILL",                    "utilities"),
    ("ELECTRICITY BILL",                      "utilities"),

    # ── MEDICAL ───────────────────────────
    ("APOLLO PHARMACY",                       "medical"),
    ("MANIPAL HOSPITAL",                      "medical"),
    ("MEDPLUS PHARMACY",                      "medical"),
    ("FORTIS HOSPITAL PAYMENT",               "medical"),
    ("MEDICINE PURCHASE",                     "medical"),
    ("DR CONSULTATION FEE",                   "medical"),
    ("HEALTH CHECKUP PAYMENT",                "medical"),
    ("NARAYANA HEALTH",                       "medical"),
    ("MAX HOSPITAL",                          "medical"),
    ("1MG MEDICINE ORDER",                    "medical"),
    ("NETMEDS ORDER",                         "medical"),
    ("DIAGNOSTIC LAB PAYMENT",                "medical"),
    ("DENTAL CLINIC PAYMENT",                 "medical"),
    ("EYE HOSPITAL PAYMENT",                  "medical"),
    ("HOSPITAL BILL PAYMENT",                 "medical"),
    ("PRACTO CONSULTATION",                   "medical"),

    # ── ENTERTAINMENT ─────────────────────
    ("NETFLIX SUBSCRIPTION",                  "entertainment"),
    ("AMAZON PRIME",                          "entertainment"),
    ("HOTSTAR SUBSCRIPTION",                  "entertainment"),
    ("SPOTIFY PREMIUM",                       "entertainment"),
    ("YOUTUBE PREMIUM",                       "entertainment"),
    ("BOOKMYSHOW TICKET",                     "entertainment"),
    ("PVR CINEMAS",                           "entertainment"),
    ("INOX MOVIES",                           "entertainment"),
    ("SONY LIV SUBSCRIPTION",                 "entertainment"),
    ("ZEE PRIME PACK",                        "entertainment"),

    # ── TRAVEL ────────────────────────────
    ("UBER RIDE",                             "travel"),
    ("OLA CABS PAYMENT",                      "travel"),
    ("IRCTC TRAIN TICKET",                    "travel"),
    ("INDIGO AIRLINES",                       "travel"),
    ("AIR INDIA TICKET",                      "travel"),
    ("RAPIDO BIKE RIDE",                      "travel"),
    ("REDBUS TICKET",                         "travel"),
    ("METRO CARD RECHARGE",                   "travel"),
    ("MAKEMYTRIP HOTEL",                      "travel"),
    ("GOIBIBO BOOKING",                       "travel"),
    ("YATRA FLIGHT BOOKING",                  "travel"),
    ("AUTO RICKSHAW PAYMENT",                 "travel"),

    # ── SHOPPING ──────────────────────────
    ("AMAZON SHOPPING",                       "shopping"),
    ("FLIPKART ORDER",                        "shopping"),
    ("MYNTRA ORDER",                          "shopping"),
    ("AJIO SHOPPING",                         "shopping"),
    ("NYKAA ORDER",                           "shopping"),
    ("MEESHO PURCHASE",                       "shopping"),
    ("LIFESTYLE STORE",                       "shopping"),
    ("WESTSIDE SHOPPING",                     "shopping"),
    ("PANTALOONS PURCHASE",                   "shopping"),
    ("DECATHLON SPORTS",                      "shopping"),
    ("CROMA ELECTRONICS",                     "shopping"),
    ("RELIANCE DIGITAL",                      "shopping"),

    # ── SALARY ────────────────────────────
    ("SALARY CREDIT ACME CORP",               "salary"),
    ("SALARY TRANSFER",                       "salary"),
    ("MONTHLY SALARY CREDIT",                 "salary"),
    ("PAYROLL CREDIT",                        "salary"),
    ("WAGES CREDIT",                          "salary"),
    ("NEFT SALARY",                           "salary"),
    ("EMPLOYER SALARY DEPOSIT",               "salary"),
    ("SALARY INFOSYS",                        "salary"),
    ("TCS SALARY CREDIT",                     "salary"),
    ("SALARY WIPRO",                          "salary"),

    # ── TRANSFER ──────────────────────────
    ("ATM WITHDRAWAL",                        "transfer"),
    ("SELF TRANSFER SAVINGS",                 "transfer"),
    ("IMPS TRANSFER",                         "transfer"),
    ("NEFT TRANSFER",                         "transfer"),
    ("RTGS FUND TRANSFER",                    "transfer"),
    ("UPI TRANSFER",                          "transfer"),
    ("GOOGLE PAY TRANSFER",                   "transfer"),
    ("PHONEPE TRANSFER",                      "transfer"),
    ("PAYTM WALLET",                          "transfer"),
    ("CASH WITHDRAWAL",                       "transfer"),

    # ── OTHER ─────────────────────────────
    ("INSURANCE PREMIUM LIC",                 "other"),
    ("MUTUAL FUND SIP",                       "other"),
    ("PPFAS MUTUAL FUND",                     "other"),
    ("ZERODHA TRADING",                       "other"),
    ("SCHOOL FEE PAYMENT",                    "other"),
    ("COLLEGE TUITION FEE",                   "other"),
    ("DONATION TEMPLE",                       "other"),
    ("CHARITY PAYMENT",                       "other"),
    ("CHEQUE PAYMENT",                        "other"),
    ("BANK CHARGES",                          "other"),
]


def train():
    descriptions = [clean_description(d) for d, _ in RAW_DATA]
    labels       = [label for _, label in RAW_DATA]

    # ── Label Encoding ────────────────────────────────────
    le = LabelEncoder()
    y  = le.fit_transform(labels)

    # ── Train / Test Split ────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        descriptions, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Pipeline: TF-IDF → Logistic Regression ───────────
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),   # unigrams + bigrams
            min_df=1,
            max_features=3000,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=1.0,
            solver="lbfgs",
            multi_class="multinomial",
        )),
    ])

    pipeline.fit(X_train, y_train)

    # ── Evaluation ────────────────────────────────────────
    y_pred = pipeline.predict(X_test)
    logger.info("📊 Classification Report:\n" +
                str(classification_report(y_test, y_pred, target_names=le.classes_)))

    # ── Save Models ───────────────────────────────────────
    os.makedirs("models", exist_ok=True)
    joblib.dump(pipeline, "models/categorizer.pkl")
    joblib.dump(le,       "models/label_encoder.pkl")

    logger.info("✅ Models saved to models/categorizer.pkl & models/label_encoder.pkl")


if __name__ == "__main__":
    train()