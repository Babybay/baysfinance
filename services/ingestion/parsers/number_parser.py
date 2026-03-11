"""
Indonesian number and date format parser utilities.

Handles:
  Numbers: "1.234.567,89" → 1234567.89, "(1.234)" → -1234, "Rp 1.234" → 1234
  Dates: "01/01/2024", "1 Januari 2024", "Jan-24", Excel serial numbers
"""

import re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Optional, Union

# Indonesian month names
INDONESIAN_MONTHS = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4,
    "mei": 5, "juni": 6, "juli": 7, "agustus": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
}

# Short English month names (used in Excel)
SHORT_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def parse_number(raw: Union[str, int, float, None]) -> float:
    """
    Parse Indonesian-formatted number to float.

    Examples:
      "1.234.567,89" → 1234567.89
      "Rp 1.234.567" → 1234567.0
      "(1.234.567)"  → -1234567.0
      "1,234,567.89" → 1234567.89  (US format)
      "-"            → 0.0
      ""             → 0.0
      None           → 0.0
    """
    if raw is None:
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)

    s = str(raw).strip()
    if not s or s == "-" or s == "—":
        return 0.0

    # Check for negative in parentheses: (1.234.567)
    negative = False
    if s.startswith("(") and s.endswith(")"):
        negative = True
        s = s[1:-1].strip()

    # Remove currency prefix
    s = re.sub(r"^[Rr][Pp]\.?\s*", "", s)
    s = s.strip()

    if not s:
        return 0.0

    # Detect format: Indonesian (dots as thousands, comma as decimal)
    # vs US/English (commas as thousands, dot as decimal)
    dot_count = s.count(".")
    comma_count = s.count(",")

    if dot_count > 0 and comma_count > 0:
        # Both present — determine which is the decimal separator
        last_dot = s.rfind(".")
        last_comma = s.rfind(",")

        if last_comma > last_dot:
            # Indonesian: 1.234.567,89
            s = s.replace(".", "").replace(",", ".")
        else:
            # US: 1,234,567.89
            s = s.replace(",", "")
    elif dot_count > 1:
        # Multiple dots → thousands separator (Indonesian without decimal)
        s = s.replace(".", "")
    elif comma_count > 1:
        # Multiple commas → thousands separator (US without decimal)
        s = s.replace(",", "")
    elif comma_count == 1:
        # Single comma — could be Indonesian decimal
        # Check if it has exactly 1-2 digits after comma
        parts = s.split(",")
        if len(parts[1]) <= 2:
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")
    # Single dot is kept as-is (standard decimal)

    try:
        result = float(s)
        return -result if negative else result
    except ValueError:
        return 0.0


def safe_decimal(raw: Union[str, int, float, None]) -> Decimal:
    """Parse to Decimal for database precision."""
    val = parse_number(raw)
    try:
        return Decimal(str(round(val, 2)))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def parse_date(raw: Union[str, int, float, datetime, date, None]) -> Optional[date]:
    """
    Parse various Indonesian/Excel date formats to Python date.

    Handles:
      datetime/date objects       → date
      "01/01/2024"               → date(2024, 1, 1)
      "01-01-2024"               → date(2024, 1, 1)
      "1 Januari 2024"           → date(2024, 1, 1)
      "Jan-24"                   → date(2024, 1, 1)
      "31-Jan-24"                → date(2024, 1, 31)
      Excel serial number (int)  → date
    """
    if raw is None:
        return None

    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw

    # Excel serial number
    if isinstance(raw, (int, float)):
        serial = int(raw)
        if 1 < serial < 100000:
            return _excel_serial_to_date(serial)
        return None

    s = str(raw).strip()
    if not s or s == "-":
        return None

    # Try dd/mm/yyyy or dd-mm-yyyy
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue

    # Try "1 Januari 2024"
    m = re.match(r"(\d{1,2})\s+(\w+)\s+(\d{4})", s, re.IGNORECASE)
    if m:
        day, month_name, year = int(m.group(1)), m.group(2).lower(), int(m.group(3))
        month_num = INDONESIAN_MONTHS.get(month_name)
        if month_num:
            try:
                return date(year, month_num, day)
            except ValueError:
                pass

    # Try "Jan-24" or "Jan-2024"
    m = re.match(r"(\w{3})-(\d{2,4})", s, re.IGNORECASE)
    if m:
        month_name, year_str = m.group(1).lower(), m.group(2)
        month_num = SHORT_MONTHS.get(month_name)
        if month_num:
            year = int(year_str)
            if year < 100:
                year += 2000
            try:
                return date(year, month_num, 1)
            except ValueError:
                pass

    # Try "31-Jan-24" or "31-Jan-2024"
    m = re.match(r"(\d{1,2})-(\w{3})-(\d{2,4})", s, re.IGNORECASE)
    if m:
        day, month_name, year_str = int(m.group(1)), m.group(2).lower(), m.group(3)
        month_num = SHORT_MONTHS.get(month_name)
        if month_num:
            year = int(year_str)
            if year < 100:
                year += 2000
            try:
                return date(year, month_num, day)
            except ValueError:
                pass

    return None


def _excel_serial_to_date(serial: int) -> date:
    """Convert Excel serial number to Python date."""
    # Excel epoch: 1899-12-30 (accounting for the 1900 leap year bug)
    base = date(1899, 12, 30)
    return base + timedelta(days=serial)
