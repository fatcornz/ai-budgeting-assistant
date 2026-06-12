from __future__ import annotations

import base64
import binascii
import csv
import html
import re
import zipfile
import zlib
from collections import defaultdict
from io import BytesIO, StringIO
from pathlib import Path
from xml.etree import ElementTree

from app.models import CategoryName, CsvCategorizeResponse, TransactionCategorySummary

MAX_DOCUMENT_BYTES = 6_000_000
csv.field_size_limit(MAX_DOCUMENT_BYTES)

CATEGORY_ORDER: tuple[CategoryName, ...] = (
    "housing",
    "food",
    "transportation",
    "utilities",
    "insurance",
    "healthcare",
    "debt",
    "services",
    "subscriptions",
    "shopping",
    "entertainment",
    "education",
    "travel",
    "childcare",
    "personal care",
    "gifts",
    "pets",
    "other",
)

CATEGORY_KEYWORDS: dict[CategoryName, tuple[str, ...]] = {
    "housing": ("rent", "mortgage", "apartment", "lease", "property management", "landlord"),
    "food": (
        "grocery",
        "groceries",
        "restaurant",
        "coffee",
        "cafe",
        "food",
        "drink",
        "beverage",
        "bar",
        "bakery",
        "deli",
        "market",
        "doordash",
        "door dash",
        "ubereats",
        "uber eats",
        "grubhub",
        "instacart",
    ),
    "transportation": (
        "gas",
        "fuel",
        "rideshare",
        "uber trip",
        "lyft",
        "transit",
        "parking",
        "train",
        "metro",
        "toll",
        "taxi",
        "bus",
        "auto",
        "car wash",
        "vehicle",
    ),
    "insurance": ("insurance", "premium"),
    "healthcare": ("doctor", "pharmacy", "medical", "dental", "health", "vision", "clinic", "hospital"),
    "utilities": ("electric", "water", "internet", "utility", "phone", "gas bill", "sewer", "wireless"),
    "debt": ("loan", "credit card", "minimum payment", "debt", "card payment"),
    "services": (
        "service",
        "repair",
        "maintenance",
        "cleaning",
        "laundry",
        "dry clean",
        "postage",
        "shipping",
        "fee",
        "legal",
        "accounting",
        "consulting",
        "tax prep",
    ),
    "subscriptions": (
        "subscription",
        "membership",
        "monthly",
        "recurring",
        "apple com bill",
        "google storage",
        "icloud",
        "adobe",
        "canva",
        "openai",
        "chatgpt",
    ),
    "shopping": (
        "store",
        "shop",
        "amazon",
        "target",
        "walmart",
        "costco",
        "retail",
        "clothing",
        "apparel",
        "electronics",
    ),
    "entertainment": (
        "movie",
        "music",
        "game",
        "concert",
        "ticket",
        "theater",
        "cinema",
        "streaming",
        "amc",
        "regal",
        "playstation",
        "xbox",
        "nintendo",
    ),
    "education": ("tuition", "textbook", "bookstore", "course", "school", "university", "college"),
    "travel": ("airline", "hotel", "airbnb", "flight", "travel", "rental car", "lodging", "resort"),
    "childcare": ("daycare", "childcare", "child care", "preschool", "babysit"),
    "personal care": ("haircut", "salon", "spa", "barber", "cosmetic", "personal care"),
    "gifts": ("gift", "donation", "charity", "flowers"),
    "pets": ("pet", "veterinary", "vet ", "chewy", "petco", "petsmart"),
    "other": (),
}

MERCHANT_RULES: tuple[tuple[CategoryName, tuple[str, ...]], ...] = (
    ("food", ("starbucks", "dunkin", "mcdonald", "chipotle", "taco bell", "wendy", "burger king", "chick fil a")),
    ("food", ("doordash", "door dash", "uber eats", "ubereats", "grubhub", "instacart")),
    ("food", ("whole foods", "trader joe", "kroger", "safeway", "aldi", "publix", "wegmans", "sprouts")),
    ("transportation", ("uber trip", "uber *trip", "lyft", "shell oil", "chevron", "exxon", "bp gas", "mobil")),
    ("transportation", ("parking", "ez pass", "e-zpass", "mta", "metrocard", "clipper", "amtrak")),
    ("shopping", ("amazon", "amzn", "target", "walmart", "costco", "best buy", "home depot", "lowes", "ikea")),
    ("shopping", ("etsy", "ebay", "shein", "temu", "uniqlo", "nike", "sephora", "ulta")),
    ("services", ("taskrabbit", "thumbtack", "handyman", "plumber", "electrician", "mechanic", "repair")),
    ("services", ("usps", "ups", "fedex", "laundromat", "dry cleaner", "cleaners", "legalzoom", "turbotax")),
    ("entertainment", ("netflix", "hulu", "disney plus", "spotify", "pandora", "youtube premium", "amc theatres")),
    ("entertainment", ("ticketmaster", "stubhub", "fandango", "steam games", "playstation", "xbox", "nintendo")),
    ("subscriptions", ("apple com bill", "google storage", "icloud", "adobe", "canva", "openai", "chatgpt")),
    ("travel", ("airbnb", "uber travel", "delta", "united airlines", "southwest", "american airlines", "marriott")),
    ("travel", ("hilton", "hyatt", "expedia", "booking com", "rental car", "hertz", "enterprise rent")),
    ("healthcare", ("cvs pharmacy", "walgreens", "rite aid", "doctor", "dentist", "hospital", "quest diagnostics")),
    ("pets", ("petco", "petsmart", "chewy", "veterinary", "animal hospital")),
)

CATEGORY_ALIASES: dict[str, CategoryName] = {
    "food": "food",
    "food & drinks": "food",
    "food and drinks": "food",
    "restaurants": "food",
    "restaurant": "food",
    "transport": "transportation",
    "transportation": "transportation",
    "transportations": "transportation",
    "services": "services",
    "service": "services",
    "shopping": "shopping",
    "entertainment": "entertainment",
}

DEBIT_COLUMNS = {
    "amount",
    "transaction amount",
    "debit",
    "withdrawal",
    "withdrawals",
    "charge",
    "charges",
    "paid out",
}
CREDIT_COLUMNS = {"credit", "deposit", "deposits", "payment received", "paid in"}
INCOME_KEYWORDS = (
    "deposit",
    "payroll",
    "direct deposit",
    "salary",
    "interest paid",
    "dividend",
    "refund",
    "payment thank you",
    "autopay payment",
    "online payment",
)
SUMMARY_KEYWORDS = (
    "account summary",
    "apr",
    "activity summary",
    "available credit",
    "balance",
    "balance transfer",
    "cash advance",
    "credit limit",
    "fees charged",
    "interest charge",
    "interest charged",
    "minimum payment",
    "new balance",
    "opening balance",
    "payment due",
    "payments and credits",
    "previous balance",
    "purchase apr",
    "rewards balance",
    "statement balance",
    "statement closing",
    "transaction summary",
    "year to date",
)
OFX_EXTENSIONS = {".ofx", ".qfx", ".qbo"}
HTML_EXTENSIONS = {".html", ".htm"}
AMOUNT_PATTERN = re.compile(
    r"(?<![\w.])"
    r"(?:"
    r"\(?-?\$?\s*\d{1,3}(?:,\d{3})+(?:\.\d{2})?\)?"
    r"|\(?-?\$?\s*\d+\.\d{2}\)?"
    r"|\(?-?\$\s*\d+(?:\.\d{2})?\)?"
    r")"
    r"(?:\s*(?:CR|DR))?"
    r"(?![\w.])",
    re.IGNORECASE,
)
DATE_PATTERN = re.compile(r"^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?$|^\d{4}-\d{2}-\d{2}$")


def categorize_csv(csv_text: str) -> CsvCategorizeResponse:
    return categorize_statement_text(csv_text)


def categorize_statement_document(file_name: str, content_type: str, file_data: str) -> CsvCategorizeResponse:
    raw = _decode_base64_document(file_data)
    if len(raw) > MAX_DOCUMENT_BYTES:
        raise ValueError("Statement file is too large. Use a file under 6 MB.")

    text = _extract_document_text(raw, file_name, content_type)
    if not text.strip():
        raise ValueError("No readable text was found in that statement.")

    return categorize_statement_text(text)


def categorize_statement_text(statement_text: str) -> CsvCategorizeResponse:
    rows, fieldnames = _read_delimited_rows(statement_text)
    if rows and _has_amount_field(fieldnames):
        return _categorize_rows(rows)
    return _categorize_statement_lines(statement_text)


def _categorize_rows(rows: list[dict[str, str]]) -> CsvCategorizeResponse:
    totals: dict[CategoryName, float] = defaultdict(float)
    imported_rows = 0
    skipped_rows = 0

    for row in rows:
        amount = _read_amount(row)
        if amount is None:
            skipped_rows += 1
            continue
        if _looks_like_summary(row) or _looks_like_income(row, amount):
            skipped_rows += 1
            continue

        category = _read_category(row) or _guess_category(row, amount)
        totals[category] += abs(amount)
        imported_rows += 1

    categories = [
        TransactionCategorySummary(name=name, amount=round(totals[name], 2))
        for name in CATEGORY_ORDER
        if totals[name] > 0
    ]
    return CsvCategorizeResponse(categories=categories, imported_rows=imported_rows, skipped_rows=skipped_rows)


def _categorize_statement_lines(statement_text: str) -> CsvCategorizeResponse:
    totals: dict[CategoryName, float] = defaultdict(float)
    imported_rows = 0
    skipped_rows = 0

    for line in statement_text.splitlines():
        normalized = " ".join(line.strip().split())
        if len(normalized) < 4:
            continue

        matches = list(AMOUNT_PATTERN.finditer(normalized))
        if not matches:
            continue

        match = _choose_transaction_amount(matches)
        amount = _parse_amount(match.group(0))
        if amount is None or amount == 0:
            skipped_rows += 1
            continue

        description = " ".join((normalized[: match.start()], normalized[match.end() :])).strip()
        row = {"description": description, "amount": match.group(0)}
        if _looks_like_summary(row) or _looks_like_income(row, amount) or not _looks_like_transaction_line(normalized, row, amount):
            skipped_rows += 1
            continue

        category = _guess_category(row, amount)
        totals[category] += abs(amount)
        imported_rows += 1

    categories = [
        TransactionCategorySummary(name=name, amount=round(totals[name], 2))
        for name in CATEGORY_ORDER
        if totals[name] > 0
    ]
    return CsvCategorizeResponse(categories=categories, imported_rows=imported_rows, skipped_rows=skipped_rows)


def _read_delimited_rows(text: str) -> tuple[list[dict[str, str]], list[str]]:
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
    except csv.Error:
        dialect = csv.excel

    reader = csv.DictReader(StringIO(text), dialect=dialect)
    fieldnames = [field or "" for field in (reader.fieldnames or [])]
    try:
        rows = [{key or "": value or "" for key, value in row.items()} for row in reader]
    except csv.Error:
        return [], []
    return rows, fieldnames


def _has_amount_field(fieldnames: list[str]) -> bool:
    normalized = {field.strip().lower() for field in fieldnames}
    return bool(normalized & (DEBIT_COLUMNS | CREDIT_COLUMNS))


def _read_amount(row: dict[str, str]) -> float | None:
    normalized_row = {key.strip().lower(): value for key, value in row.items() if key}

    for key in ("debit", "withdrawal", "withdrawals", "charge", "charges", "paid out"):
        amount = _parse_amount(normalized_row.get(key))
        if amount:
            return amount

    for key, value in row.items():
        if key and key.strip().lower() in DEBIT_COLUMNS:
            amount = _parse_amount(value)
            if amount is None or amount == 0:
                continue
            if _looks_like_income(row, amount):
                return None
            return amount

    for key in CREDIT_COLUMNS:
        if _parse_amount(normalized_row.get(key)):
            return None
    return None


def _read_category(row: dict[str, str]) -> CategoryName | None:
    for key, value in row.items():
        if key and key.strip().lower() == "category":
            normalized = _normalize_text(value)
            if normalized in CATEGORY_ALIASES:
                return CATEGORY_ALIASES[normalized]
            if normalized in CATEGORY_KEYWORDS:
                return normalized  # type: ignore[return-value]
    return None


def _guess_category(row: dict[str, str], amount: float | None = None) -> CategoryName:
    haystack = _normalize_text(" ".join(str(value) for value in row.values()))
    scores: dict[CategoryName, int] = defaultdict(int)

    if amount is not None and amount > 0 and _looks_like_income(row, amount):
        return "other"

    for category, merchants in MERCHANT_RULES:
        for merchant in merchants:
            if _contains_term(haystack, merchant):
                scores[category] += 8 + min(len(_normalize_text(merchant).split()), 4)

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if _contains_term(haystack, keyword):
                scores[category] += 3 + min(len(_normalize_text(keyword).split()), 3)

    if scores:
        return max(scores.items(), key=lambda item: (item[1], -CATEGORY_ORDER.index(item[0])))[0]
    return "other"


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9&]+", " ", value.lower())).strip()


def _contains_term(haystack: str, term: str) -> bool:
    normalized_term = _normalize_text(term)
    if not normalized_term:
        return False
    return re.search(rf"(?<![a-z0-9]){re.escape(normalized_term)}(?![a-z0-9])", haystack) is not None


def _parse_amount(value: str | None) -> float | None:
    if value is None:
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    is_parenthesized = cleaned.startswith("(") and cleaned.endswith(")")
    cleaned = cleaned.replace("$", "").replace(",", "").replace("(", "").replace(")", "").strip()
    if cleaned.upper().endswith(("CR", "DR")):
        cleaned = cleaned[:-2].strip()

    try:
        amount = float(cleaned)
    except ValueError:
        return None

    return -amount if is_parenthesized else amount


def _looks_like_income(row: dict[str, str], amount: float) -> bool:
    if amount < 0:
        return False
    haystack = _normalize_text(" ".join(str(value) for value in row.values()))
    return any(_contains_term(haystack, keyword) for keyword in INCOME_KEYWORDS)


def _looks_like_summary(row: dict[str, str]) -> bool:
    haystack = _normalize_text(" ".join(str(value) for value in row.values()))
    return any(_contains_term(haystack, keyword) for keyword in SUMMARY_KEYWORDS)


def _looks_like_transaction_line(line: str, row: dict[str, str], amount: float) -> bool:
    if amount < 0:
        return True
    if _line_starts_with_date(line):
        return True
    haystack = _normalize_text(" ".join(str(value) for value in row.values()))
    return _has_merchant_match(haystack)


def _line_starts_with_date(line: str) -> bool:
    first_token = line.split(maxsplit=1)[0] if line.split() else ""
    return DATE_PATTERN.match(first_token) is not None


def _has_merchant_match(haystack: str) -> bool:
    return any(_contains_term(haystack, merchant) for _, merchants in MERCHANT_RULES for merchant in merchants)


def _decode_base64_document(file_data: str) -> bytes:
    try:
        return base64.b64decode(file_data, validate=True)
    except binascii.Error as error:
        raise ValueError("Statement file could not be decoded.") from error


def _extract_document_text(raw: bytes, file_name: str, content_type: str) -> str:
    extension = Path(file_name).suffix.lower()
    normalized_type = content_type.lower()

    if extension == ".pdf" or normalized_type == "application/pdf":
        return _extract_pdf_text(raw)
    if extension == ".xlsx":
        return _extract_xlsx_text(raw)

    text = _decode_text(raw)
    if extension in OFX_EXTENSIONS:
        return _extract_ofx_text(text)
    if extension in HTML_EXTENSIONS or "html" in normalized_type:
        return _strip_html(text)
    return text


def _decode_text(raw: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", errors="ignore")


def _extract_ofx_text(text: str) -> str:
    blocks = re.findall(
        r"<STMTTRN>(.*?)(?:</STMTTRN>|(?=<STMTTRN>)|(?=</BANKTRANLIST>))",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not blocks:
        return text

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "description", "amount"])
    for block in blocks:
        amount = _ofx_tag(block, "TRNAMT")
        if not amount:
            continue
        description = " ".join(
            value for value in (_ofx_tag(block, "NAME"), _ofx_tag(block, "MEMO")) if value
        )
        writer.writerow([_ofx_tag(block, "DTPOSTED") or "", description or "Transaction", amount])
    return output.getvalue()


def _ofx_tag(block: str, tag: str) -> str:
    match = re.search(rf"<{tag}>([^<\r\n]+)", block, flags=re.IGNORECASE)
    return html.unescape(match.group(1).strip()) if match else ""


def _strip_html(text: str) -> str:
    with_row_breaks = re.sub(r"</(?:tr|p|li|div|br|table)>", "\n", text, flags=re.IGNORECASE)
    without_tags = re.sub(r"<[^>]+>", " ", with_row_breaks)
    return html.unescape(without_tags)


def _extract_xlsx_text(raw: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(raw)) as archive:
            shared_strings = _read_xlsx_shared_strings(archive)
            rows: list[str] = []
            sheet_names = sorted(
                name for name in archive.namelist() if name.startswith("xl/worksheets/") and name.endswith(".xml")
            )
            for sheet_name in sheet_names:
                root = ElementTree.fromstring(archive.read(sheet_name))
                for row in root.iter():
                    if _local_name(row.tag) != "row":
                        continue
                    values = [
                        _xlsx_cell_text(cell, shared_strings)
                        for cell in row
                        if _local_name(cell.tag) == "c"
                    ]
                    if any(value.strip() for value in values):
                        rows.append(_csv_line(values))
            return "\n".join(rows)
    except (ElementTree.ParseError, KeyError, zipfile.BadZipFile) as error:
        raise ValueError("Spreadsheet statement could not be read. Try exporting it as CSV.") from error


def _read_xlsx_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []

    return ["".join(item.itertext()) for item in root if _local_name(item.tag) == "si"]


def _xlsx_cell_text(cell: ElementTree.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t", "")
    if cell_type == "inlineStr":
        return "".join(cell.itertext()).strip()

    value = next((child.text or "" for child in cell if _local_name(child.tag) == "v"), "")
    if cell_type == "s" and value.isdigit():
        index = int(value)
        return shared_strings[index] if index < len(shared_strings) else ""
    return value.strip()


def _csv_line(values: list[str]) -> str:
    output = StringIO()
    csv.writer(output).writerow(values)
    return output.getvalue().strip("\r\n")


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _extract_pdf_text(raw: bytes) -> str:
    strings: list[str] = []
    for stream_match in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", raw, flags=re.DOTALL):
        stream_data = stream_match.group(1).strip(b"\r\n")
        for candidate in _pdf_stream_candidates(stream_data):
            strings.extend(_extract_pdf_strings(candidate))

    if not strings:
        strings = _extract_pdf_strings(raw)

    return _group_pdf_strings_into_rows(strings)


def _pdf_stream_candidates(stream_data: bytes) -> list[bytes]:
    candidates = [stream_data]
    try:
        candidates.append(zlib.decompress(stream_data))
    except zlib.error:
        pass
    return candidates


def _extract_pdf_strings(data: bytes) -> list[str]:
    text = data.decode("latin-1", errors="ignore")
    strings = _extract_pdf_literal_strings(text)
    strings.extend(_extract_pdf_hex_strings(text))
    return [html.unescape(item.strip()) for item in strings if item.strip()]


def _extract_pdf_literal_strings(text: str) -> list[str]:
    strings: list[str] = []
    index = 0
    while index < len(text):
        if text[index] != "(":
            index += 1
            continue

        index += 1
        value: list[str] = []
        escaped = False
        depth = 1
        while index < len(text) and depth > 0:
            char = text[index]
            if escaped:
                value.append(_decode_pdf_escape(char))
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == "(":
                depth += 1
                value.append(char)
            elif char == ")":
                depth -= 1
                if depth > 0:
                    value.append(char)
            else:
                value.append(char)
            index += 1
        strings.append("".join(value))
    return strings


def _decode_pdf_escape(char: str) -> str:
    return {
        "n": "\n",
        "r": "\n",
        "t": "\t",
        "b": "\b",
        "f": "\f",
    }.get(char, char)


def _extract_pdf_hex_strings(text: str) -> list[str]:
    strings: list[str] = []
    for match in re.finditer(r"<([0-9A-Fa-f\s]{4,})>", text):
        hex_value = re.sub(r"\s+", "", match.group(1))
        try:
            raw = bytes.fromhex(hex_value)
        except ValueError:
            continue
        if raw.startswith(b"\xfe\xff"):
            strings.append(raw[2:].decode("utf-16-be", errors="ignore"))
        else:
            strings.append(raw.decode("latin-1", errors="ignore"))
    return strings


def _group_pdf_strings_into_rows(strings: list[str]) -> str:
    rows: list[str] = []
    current: list[str] = []

    for item in strings:
        normalized = " ".join(item.split())
        if not normalized:
            continue
        if DATE_PATTERN.match(normalized) and current:
            rows.append(" ".join(current))
            current = [normalized]
        else:
            current.append(normalized)

    if current:
        rows.append(" ".join(current))
    return "\n".join(rows)


def _choose_transaction_amount(matches: list[re.Match[str]]) -> re.Match[str]:
    for match in matches:
        amount = _parse_amount(match.group(0))
        if amount is not None and amount < 0:
            return match
    return matches[0]
