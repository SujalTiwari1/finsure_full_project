import re

# Words that add no signal for categorization
STOPWORDS = {
    "the", "a", "an", "to", "of", "and", "in", "on", "for",
    "by", "at", "from", "with", "is", "are", "was", "be",
    "nr", "ref", "no", "id", "txn", "upi", "neft", "imps",
    "transfer", "payment", "paid", "via", "through",
}


def clean_description(text: str) -> str:
    """
    Cleans a raw transaction description for TF-IDF input.

    Steps:
      1. Lowercase
      2. Remove special characters & digits
      3. Remove stopwords
      4. Strip extra whitespace
    """
    text = text.lower()

    # Remove digits and special characters, keep spaces
    text = re.sub(r"[^a-z\s]", " ", text)

    # Tokenize and remove stopwords
    tokens = [word for word in text.split() if word not in STOPWORDS and len(word) > 1]

    return " ".join(tokens)