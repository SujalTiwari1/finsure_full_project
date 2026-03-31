import joblib
from utils.text_cleaner import clean_description
from utils.constants import CATEGORIZER_MODEL_PATH, LABEL_ENCODER_PATH
from utils.logger import get_logger

logger = get_logger(__name__)


def load_categorizer() -> tuple:
    """
    Loads the TF-IDF + LR pipeline and label encoder from disk.
    Called once at app startup via lifespan in main.py.
    Returns: (pipeline, label_encoder)
    """
    try:
        pipeline = joblib.load(CATEGORIZER_MODEL_PATH)
        le       = joblib.load(LABEL_ENCODER_PATH)
        logger.info("✅ Categorizer model loaded successfully")
        return pipeline, le
    except FileNotFoundError:
        logger.error(
            "❌ Categorizer model not found. "
            "Run: python services/training/train_categorizer.py"
        )
        raise


def categorize_transactions(
    transactions: list[dict],
    pipeline,
    le,
) -> list[dict]:
    """
    Predicts a category for each transaction in-place.

    Args:
        transactions : list of transaction dicts (from parser_service)
        pipeline     : loaded TF-IDF + LR pipeline (from app.state)
        le           : loaded LabelEncoder (from app.state)

    Returns:
        Same list with 'category' field populated.
    """
    if not transactions:
        return transactions

    # Clean descriptions for model input
    descriptions = [clean_description(t["description"]) for t in transactions]

    # Predict
    predictions = pipeline.predict(descriptions)
    categories  = le.inverse_transform(predictions)

    # Attach category to each transaction
    for txn, category in zip(transactions, categories):
        txn["category"] = category

    logger.info(f"🏷️  Categorized {len(transactions)} transactions")
    return transactions