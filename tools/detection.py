"""
Detection logic for brand family, pack format, and category.
Extracts structured information from Inn Express product descriptions and DUOI fields.
"""
import re
from typing import Optional


# Brand family patterns (order matters - more specific first)
BRAND_FAMILY_PATTERNS = [
    (r"black\s*fox", "Black Fox"),
    (r"vintage\s*reserve", "Vintage"),
    (r"vintage", "Vintage"),
    (r"craft", "Craft"),
    (r"premium", "Premium"),
    (r"dabinett", "Dabinett"),
    (r"browns", "Browns"),
    (r"breakwell", "Breakwell"),
    (r"kingston\s*black", "Kingston Black"),
    (r"mulled", "Mulled"),
    (r"perry", "Perry"),
    # Dry patterns - must come before generic dry/medium/sweet
    (r"dry\s*sparkling", "Dry"),
    (r"organic.*dry|dry.*organic", "Dry"),
    (r"\bdry\b", "Dry"),  # Changed from Premium to Dry
    # Medium and Sweet still map to Premium
    (r"organic.*medium|medium.*organic", "Premium"),
    (r"organic.*sweet|sweet.*organic", "Premium"),
    (r"\bmedium\b", "Premium"),
    (r"\bsweet\b", "Premium"),
]

# Pack format patterns (order matters - more specific first)
PACK_FORMAT_PATTERNS = [
    # Mini kegs
    (r"mini\s*keg|5\s*l(?:itre)?(?:\s|$)|5\s*ltr", "Mini Keg"),
    # Standard kegs
    (r"keg|30\s*l(?:itre)?|30\s*ltr", "Keg 30L"),
    (r"50\s*l(?:itre)?|50\s*ltr", "Keg 50L"),
    # BIB (Specific sizes first)
    (r"10\s*l(?:itre)?|10\s*ltr", "BIB 10L"),
    (r"3\s*l(?:itre)?|3\s*ltr", "BIB 3L"),
    (r"bib|bag\s*in\s*box|20\s*l(?:itre)?|20\s*ltr", "BIB 20L"),
    # 660ml bottles
    (r"660\s*ml|66\s*cl", "Bottle 660ml"),
    # 500ml bottles
    (r"500\s*ml|50\s*cl", "Bottle 500ml"),
    # 375ml bottles
    (r"375\s*ml|37\.5\s*cl", "Bottle 375ml"),
    # Cans
    (r"330\s*ml|33\s*cl|can", "Can 330ml"),
]

# Category mapping from pack format
FORMAT_TO_CATEGORY = {
    "Bottle 500ml": "bottle500",
    "Bottle 660ml": "bottle660",
    "Bottle 375ml": "bottle375",
    "Can 330ml": "can330",
    "Keg": "keg",
    "Keg 30L": "keg30",
    "Keg 50L": "keg50",
    "Mini Keg": "minikeg",
    "BIB 20L": "bib20",
    "BIB 10L": "bib10",
    "BIB 3L": "bib3",
}


def detect_family(description: str) -> Optional[str]:
    """
    Extract brand family from product description.

    Args:
        description: Product description text

    Returns:
        Brand family name or None if not detected
    """
    if not description:
        return None

    text = description.lower()

    for pattern, family in BRAND_FAMILY_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return family

    return None


def detect_format(description: str, duoi: Optional[str] = None) -> Optional[str]:
    """
    Extract pack format from product description and DUOI.

    Args:
        description: Product description text
        duoi: Description Unit of Issue (e.g., "500ml x 12")

    Returns:
        Pack format name or None if not detected
    """
    # Combine description and DUOI for matching
    text = f"{description or ''} {duoi or ''}".lower()

    if not text.strip():
        return None

    for pattern, format_name in PACK_FORMAT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return format_name

    return None


def derive_category(pack_format: Optional[str]) -> str:
    """
    Derive category code from pack format.

    Args:
        pack_format: Pack format name

    Returns:
        Category code or 'unknown'
    """
    if not pack_format:
        return "unknown"

    return FORMAT_TO_CATEGORY.get(pack_format, "unknown")


def detect_all(
    description: str, duoi: Optional[str] = None
) -> dict[str, Optional[str]]:
    """
    Detect all attributes from description and DUOI.

    Args:
        description: Product description text
        duoi: Description Unit of Issue

    Returns:
        Dictionary with detected_family, detected_format, detected_category
    """
    detected_family = detect_family(description)
    detected_format = detect_format(description, duoi)
    detected_category = derive_category(detected_format)

    return {
        "detected_family": detected_family,
        "detected_format": detected_format,
        "detected_category": detected_category,
    }


def parse_quantity(qty_str: str) -> Optional[float]:
    """
    Parse quantity from string, handling various formats.

    Args:
        qty_str: Quantity string

    Returns:
        Parsed quantity as float or None
    """
    if not qty_str:
        return None

    try:
        # Remove commas and whitespace
        cleaned = str(qty_str).replace(",", "").strip()
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def clean_text(text: Optional[str]) -> Optional[str]:
    """Clean and normalize text field."""
    if not text:
        return None
    return str(text).strip()


def normalize_postcode(postcode: Optional[str]) -> Optional[str]:
    """Normalize UK postcode format."""
    if not postcode:
        return None

    # Remove extra spaces and convert to uppercase
    cleaned = re.sub(r"\s+", " ", str(postcode).strip().upper())

    # Ensure space before inward code (last 3 characters)
    if len(cleaned) >= 4 and " " not in cleaned:
        cleaned = cleaned[:-3] + " " + cleaned[-3:]

    return cleaned


# Tests for detection logic
if __name__ == "__main__":
    # Test cases
    test_cases = [
        ("Black Fox Organic Sparkling Cider 50cl x 12", "500ml x 12"),
        ("Dunkertons CRAFT Cider 5% Bottles", "500ml x 12"),
        ("Dunkertons Dry Organic Cider 500ml", "500ml x 12"),
        ("Dunkertons Vintage Reserve 660ml", "660ml x 12"),
        ("Dunkertons CRAFT Cider Keg 30L", "30L"),
        ("Dunkertons Medium Organic BIB", "20L"),
        ("Perry Organic Bottles", "500ml x 12"),
        ("Dunkertons 10L Mulled Cider **BIB**", "10 Ltr BIB"),
        ("Organic Mulled Cider BiB 10L", "10L"),
    ]

    print("Detection Test Results:")
    print("-" * 80)

    for desc, duoi in test_cases:
        result = detect_all(desc, duoi)
        print(f"Description: {desc}")
        print(f"DUOI: {duoi}")
        print(f"  -> Family: {result['detected_family']}")
        print(f"  -> Format: {result['detected_format']}")
        print(f"  -> Category: {result['detected_category']}")
        print()
