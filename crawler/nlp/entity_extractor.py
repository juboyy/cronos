"""Entity extraction from financial text using regex (no external deps)."""
import re
from nlp.ticker_map import find_entities_in_text


def extract_entities(title, summary=None, content=None):
    """Extract entities from article text. Returns deduplicated list."""
    full_text = ' '.join(filter(None, [title, summary, content]))
    return find_entities_in_text(full_text)
