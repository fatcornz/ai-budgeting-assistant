from app.models import BudgetInput
from app.services.budget_analyzer import analyze_budget


def test_analyze_budget_returns_score_and_recommendations():
    budget = BudgetInput(
        monthly_income=4000,
        categories=[
            {"name": "housing", "amount": 1200},
            {"name": "food", "amount": 450},
            {"name": "transportation", "amount": 300},
            {"name": "utilities", "amount": 180},
            {"name": "debt", "amount": 200},
        ],
        savings_goals=[
            {"name": "Emergency Fund", "target_amount": 3000, "current_amount": 1000, "months_to_goal": 10}
        ],
        debt_payments=[
            {"name": "Credit Card", "balance": 900, "minimum_payment": 100, "interest_rate": 21.0}
        ],
    )

    analysis = analyze_budget(budget)

    assert analysis.total_expenses == 2330
    assert analysis.savings_target_monthly == 200
    assert analysis.budget_score > 0
    assert len(analysis.recommendations) >= 1
