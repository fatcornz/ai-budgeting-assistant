from __future__ import annotations

import os
from typing import List

from app.models import BudgetAnalysis, BudgetInput, ChatMessage, ChatResponse
from app.services.budget_analyzer import analyze_budget
from app.services.financial_literacy import search_lessons

SYSTEM_PROMPT = """
You are a budgeting education assistant for young adults and early-career professionals.
Give practical, friendly, educational guidance based only on the user's provided budget.
Do not claim to be a financial advisor. Do not give investment, tax, or legal advice.
Explain tradeoffs clearly and suggest small next steps.
""".strip()


def generate_chat_response(message: str, budget: BudgetInput, history: List[ChatMessage]) -> ChatResponse:
    analysis = analyze_budget(budget)
    llm_reply = _try_openai_response(message=message, budget=budget, analysis=analysis, history=history)

    if llm_reply:
        return ChatResponse(
            reply=llm_reply,
            suggested_actions=_suggest_actions(analysis),
            used_llm=True,
        )

    return ChatResponse(
        reply=_rule_based_reply(message=message, analysis=analysis),
        suggested_actions=_suggest_actions(analysis),
        used_llm=False,
    )


def _try_openai_response(
    message: str,
    budget: BudgetInput,
    analysis: BudgetAnalysis,
    history: List[ChatMessage],
) -> str | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        compact_history = [item.model_dump() for item in history[-6:]]

        response = client.chat.completions.create(
            model=model,
            temperature=0.4,
            max_tokens=500,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Budget data:\n"
                        f"{budget.model_dump_json(indent=2)}\n\n"
                        "Computed analysis:\n"
                        f"{analysis.model_dump_json(indent=2)}\n\n"
                        f"Recent chat history: {compact_history}\n\n"
                        f"User question: {message}"
                    ),
                },
            ],
        )
        return response.choices[0].message.content or None
    except Exception:
        return None


def _rule_based_reply(message: str, analysis: BudgetAnalysis) -> str:
    lower_message = message.lower()
    lesson = search_lessons(message, limit=1)[0]
    intro = (
        f"Based on your current budget, your score is {analysis.budget_score}/100. "
        f"You have ${analysis.remaining_cash:,.2f} left after planned expenses and monthly savings targets. "
    )

    if "save" in lower_message or "savings" in lower_message or "goal" in lower_message:
        return intro + (
            f"Your current savings target is ${analysis.savings_target_monthly:,.2f}/month, "
            f"which is {analysis.savings_rate:.1f}% of your income. "
            f"{lesson.content} A good next step is to automate savings right after payday, then adjust flexible categories if cash flow gets tight."
        )

    if "debt" in lower_message or "loan" in lower_message or "credit" in lower_message:
        return intro + (
            f"Your minimum debt payments are ${analysis.total_debt_minimums:,.2f}/month, "
            f"or {analysis.debt_to_income_ratio:.1f}% of income. "
            "If any debt has a high interest rate, paying extra there usually creates the biggest breathing room over time."
        )

    if "cut" in lower_message or "reduce" in lower_message or "spending" in lower_message:
        high_items = [item for item in analysis.category_insights if item.status in {"watch", "high"}]
        if high_items:
            first = high_items[0]
            return intro + (
                f"The first category I would inspect is {first.name}, currently ${first.amount:,.2f}/month. "
                f"A 10% reduction would free about ${first.amount * 0.10:,.2f}/month without needing to redesign the whole budget."
            )

    recommendations = " ".join(analysis.recommendations[:3])
    warnings = " ".join(analysis.warnings[:2])
    return intro + (warnings + " " if warnings else "") + recommendations + f" Helpful concept: {lesson.content}"


def _suggest_actions(analysis: BudgetAnalysis) -> List[str]:
    actions = []
    if analysis.remaining_cash < 0:
        actions.append("Bring the budget back above $0 remaining cash flow.")
    if analysis.savings_rate < 10:
        actions.append("Increase monthly savings target toward at least 10% of income.")
    if analysis.debt_to_income_ratio > 15:
        actions.append("Review debt payments and prioritize the highest-interest balance.")

    high_categories = [item.name for item in analysis.category_insights if item.status == "high"]
    if high_categories:
        actions.append(f"Audit high-spend categories: {', '.join(high_categories)}.")

    if not actions:
        actions.append("Keep tracking weekly spending trends.")
        actions.append("Revisit savings goals at the end of the month.")
    return actions[:4]
