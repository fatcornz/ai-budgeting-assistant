from __future__ import annotations

from collections import defaultdict
from typing import Dict, List

from app.models import BudgetAnalysis, BudgetInput, CategoryInsight

CATEGORY_LIMITS = {
    "housing": 0.32,
    "food": 0.15,
    "transportation": 0.15,
    "utilities": 0.10,
    "insurance": 0.10,
    "healthcare": 0.08,
    "debt": 0.12,
    "services": 0.08,
    "subscriptions": 0.04,
    "shopping": 0.08,
    "entertainment": 0.08,
    "education": 0.08,
    "travel": 0.10,
    "childcare": 0.12,
    "personal care": 0.06,
    "gifts": 0.05,
    "pets": 0.05,
    "other": 0.08,
}

CORE_AREAS = ["income", "expenses", "savings goals", "debt payments", "spending categories"]


def analyze_budget(budget: BudgetInput) -> BudgetAnalysis:
    category_totals = _merge_categories(budget)
    total_expenses = round(sum(category_totals.values()), 2)
    total_debt_minimums = round(sum(debt.minimum_payment for debt in budget.debt_payments), 2)
    savings_target_monthly = round(sum(
        max(goal.target_amount - goal.current_amount, 0) / goal.months_to_goal
        for goal in budget.savings_goals
    ), 2)
    remaining_cash = round(budget.monthly_income - total_expenses - savings_target_monthly, 2)
    savings_rate = round((savings_target_monthly / budget.monthly_income) * 100, 2)
    debt_to_income_ratio = round((total_debt_minimums / budget.monthly_income) * 100, 2)

    category_insights = _build_category_insights(category_totals, budget.monthly_income)
    warnings = _build_warnings(
        total_expenses=total_expenses,
        remaining_cash=remaining_cash,
        savings_rate=savings_rate,
        debt_to_income_ratio=debt_to_income_ratio,
        category_insights=category_insights,
    )
    recommendations = _build_recommendations(
        budget=budget,
        category_insights=category_insights,
        remaining_cash=remaining_cash,
        savings_target_monthly=savings_target_monthly,
        debt_to_income_ratio=debt_to_income_ratio,
    )
    budget_score = _score_budget(
        remaining_cash=remaining_cash,
        savings_rate=savings_rate,
        debt_to_income_ratio=debt_to_income_ratio,
        warnings=warnings,
    )

    return BudgetAnalysis(
        total_expenses=total_expenses,
        remaining_cash=remaining_cash,
        savings_target_monthly=savings_target_monthly,
        total_debt_minimums=total_debt_minimums,
        savings_rate=savings_rate,
        debt_to_income_ratio=debt_to_income_ratio,
        budget_score=budget_score,
        category_insights=category_insights,
        recommendations=recommendations,
        warnings=warnings,
    )


def _merge_categories(budget: BudgetInput) -> Dict[str, float]:
    totals: Dict[str, float] = defaultdict(float)
    for category in budget.categories:
        totals[category.name] += category.amount
    return {key: round(value, 2) for key, value in totals.items()}


def _build_category_insights(category_totals: Dict[str, float], income: float) -> List[CategoryInsight]:
    insights: List[CategoryInsight] = []
    for name, amount in sorted(category_totals.items(), key=lambda item: item[1], reverse=True):
        percentage = amount / income if income else 0
        limit = CATEGORY_LIMITS.get(name, 0.08)
        if percentage >= limit * 1.35:
            status = "high"
        elif percentage >= limit:
            status = "watch"
        elif percentage <= limit * 0.5:
            status = "low"
        else:
            status = "healthy"
        insights.append(
            CategoryInsight(
                name=name,
                amount=round(amount, 2),
                percentage_of_income=round(percentage * 100, 2),
                status=status,
            )
        )
    return insights


def _build_warnings(
    total_expenses: float,
    remaining_cash: float,
    savings_rate: float,
    debt_to_income_ratio: float,
    category_insights: List[CategoryInsight],
) -> List[str]:
    warnings: List[str] = []
    if remaining_cash < 0:
        warnings.append("Your planned spending and savings goals exceed monthly income.")
    if savings_rate < 10:
        warnings.append("Your planned savings rate is below 10% of monthly income.")
    if debt_to_income_ratio > 15:
        warnings.append("Debt minimum payments are taking more than 15% of monthly income.")

    high_categories = [item.name for item in category_insights if item.status == "high"]
    if high_categories:
        warnings.append(f"High spending detected in: {', '.join(high_categories)}.")

    if total_expenses <= 0:
        warnings.append("No expenses were entered, so the analysis may not be realistic.")
    return warnings


def _build_recommendations(
    budget: BudgetInput,
    category_insights: List[CategoryInsight],
    remaining_cash: float,
    savings_target_monthly: float,
    debt_to_income_ratio: float,
) -> List[str]:
    recommendations: List[str] = []
    high_categories = [item for item in category_insights if item.status in {"watch", "high"}]

    if remaining_cash < 0:
        recommendations.append(
            "Reduce flexible spending or extend a savings-goal timeline so the plan stays cash-flow positive."
        )
    elif remaining_cash > budget.monthly_income * 0.08:
        recommendations.append(
            "You have extra monthly cash flow. Consider assigning it to emergency savings, high-interest debt, or a priority goal."
        )

    if savings_target_monthly > 0:
        recommendations.append(
            f"Automate about ${savings_target_monthly:,.0f} per month toward your active savings goals."
        )

    if high_categories:
        biggest = high_categories[0]
        recommendations.append(
            f"Review {biggest.name} first. Cutting it by 10% would free about ${biggest.amount * 0.10:,.0f} per month."
        )

    high_interest_debt = [debt for debt in budget.debt_payments if debt.interest_rate and debt.interest_rate >= 15]
    if high_interest_debt:
        debt_names = ", ".join(debt.name for debt in high_interest_debt)
        recommendations.append(
            f"Prioritize extra payments toward high-interest debt: {debt_names}."
        )
    elif debt_to_income_ratio <= 10 and budget.debt_payments:
        recommendations.append("Debt minimums look manageable; keep making on-time payments and avoid adding new balances.")

    if not recommendations:
        recommendations.append("Your budget is balanced. Keep tracking trends and revisit goals each month.")

    return recommendations[:5]


def _score_budget(remaining_cash: float, savings_rate: float, debt_to_income_ratio: float, warnings: List[str]) -> int:
    score = 100
    if remaining_cash < 0:
        score -= 30
    elif remaining_cash < 100:
        score -= 10

    if savings_rate < 5:
        score -= 20
    elif savings_rate < 10:
        score -= 10
    elif savings_rate >= 20:
        score += 5

    if debt_to_income_ratio > 20:
        score -= 20
    elif debt_to_income_ratio > 15:
        score -= 10

    score -= min(len(warnings) * 4, 16)
    return max(0, min(100, score))
