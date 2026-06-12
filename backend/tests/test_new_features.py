import base64

from app.services.csv_importer import categorize_csv, categorize_statement_document
from app.services.financial_literacy import search_lessons


def test_categorize_csv_rolls_up_transaction_amounts():
    csv_text = """date,description,amount
2026-06-01,Rent payment,-1200
2026-06-02,Grocery Store,-85.40
2026-06-03,Spotify,-12
"""

    result = categorize_csv(csv_text)
    totals = {item.name: item.amount for item in result.categories}

    assert result.imported_rows == 3
    assert totals["housing"] == 1200
    assert totals["food"] == 85.4
    assert totals["entertainment"] == 12


def test_categorize_csv_skips_deposits_and_uses_common_categories():
    csv_text = """date,description,amount
2026-06-01,Payroll Deposit,2500
2026-06-02,Airbnb booking,-230
2026-06-03,Petco,-45
"""

    result = categorize_csv(csv_text)
    totals = {item.name: item.amount for item in result.categories}

    assert result.imported_rows == 2
    assert result.skipped_rows == 1
    assert totals["travel"] == 230
    assert totals["pets"] == 45


def test_categorize_csv_uses_merchant_names_before_broad_keywords():
    csv_text = """date,description,amount
2026-06-01,Uber Eats Marketplace,-32.50
2026-06-02,Uber Trip Help.uber.com,-18.40
2026-06-03,Netflix.com,-15.99
2026-06-04,Target Store T-1234,-64.10
2026-06-05,TaskRabbit Cleaning Service,-95.00
"""

    result = categorize_csv(csv_text)
    totals = {item.name: item.amount for item in result.categories}

    assert totals["food"] == 32.5
    assert totals["transportation"] == 18.4
    assert totals["entertainment"] == 15.99
    assert totals["shopping"] == 64.1
    assert totals["services"] == 95


def test_categorize_csv_accepts_common_category_aliases():
    csv_text = """date,description,amount,category
2026-06-01,Dinner,-48.00,Food & Drinks
2026-06-02,Car ride,-21.00,transportations
2026-06-03,Laundry,-14.00,Services
"""

    result = categorize_csv(csv_text)
    totals = {item.name: item.amount for item in result.categories}

    assert totals["food"] == 48
    assert totals["transportation"] == 21
    assert totals["services"] == 14


def test_categorize_csv_matches_expected_merchant_totals_and_skips_summaries():
    csv_text = """date,description,amount
2026-06-01,Target Store T-1234,-500.00
2026-06-02,Amazon Marketplace,-354.42
2026-06-03,Uber Trip Help.uber.com,-100.00
2026-06-04,Shell Oil Fuel,-226.23
2026-06-05,Starbucks Coffee,-34.83
2026-06-06,Uber Eats Marketplace,-100.00
2026-06-07,TaskRabbit Cleaning Service,-72.25
2026-06-08,Spotify,-6.27
2026-06-09,Previous Balance,2107.00
2026-06-10,Minimum Payment Due,35.00
2026-06-11,Utilities APR Disclosure,2107.00
2026-06-12,Insurance Balance Notice,6.00
"""

    result = categorize_csv(csv_text)
    totals = {item.name: item.amount for item in result.categories}

    assert totals["shopping"] == 854.42
    assert totals["transportation"] == 326.23
    assert totals["food"] == 134.83
    assert totals["services"] == 72.25
    assert totals["entertainment"] == 6.27
    assert "utilities" not in totals


def test_categorize_statement_document_reads_text_statement():
    statement = """06/01/2026 Rent payment -1200.00
06/02/2026 Payroll Deposit 2500.00
06/03/2026 Airbnb booking -230.00
"""
    file_data = base64.b64encode(statement.encode()).decode()

    result = categorize_statement_document("statement.txt", "text/plain", file_data)
    totals = {item.name: item.amount for item in result.categories}

    assert result.imported_rows == 2
    assert result.skipped_rows == 1
    assert totals["housing"] == 1200
    assert totals["travel"] == 230


def test_categorize_statement_document_reads_text_pdf():
    pdf = b"""%PDF-1.4
1 0 obj
<< /Length 81 >>
stream
BT (06/01/2026) Tj (Rent payment) Tj (-1200.00) Tj ET
endstream
endobj
%%EOF
"""
    file_data = base64.b64encode(pdf).decode()

    result = categorize_statement_document("statement.pdf", "application/pdf", file_data)
    totals = {item.name: item.amount for item in result.categories}

    assert result.imported_rows == 1
    assert totals["housing"] == 1200


def test_categorize_statement_document_handles_long_pdf_text_stream():
    long_description = " ".join(["statement"] * 25000)
    pdf = f"""%PDF-1.4
1 0 obj
<< /Length 220000 >>
stream
BT ({long_description}) Tj (06/01/2026) Tj (Rent payment) Tj (-1200.00) Tj ET
endstream
endobj
%%EOF
""".encode()
    file_data = base64.b64encode(pdf).decode()

    result = categorize_statement_document("statement.pdf", "application/pdf", file_data)
    totals = {item.name: item.amount for item in result.categories}

    assert result.imported_rows == 1
    assert totals["housing"] == 1200


def test_search_lessons_returns_relevant_snippet():
    snippets = search_lessons("highest interest debt payoff")

    assert snippets
    assert snippets[0].topic == "debt"
