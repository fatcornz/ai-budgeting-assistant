from __future__ import annotations

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

CategoryName = Literal[
    "housing",
    "food",
    "transportation",
    "utilities",
    "insurance",
    "debt",
    "entertainment",
    "shopping",
    "healthcare",
    "subscriptions",
    "education",
    "other",
]


class BudgetCategory(BaseModel):
    name: CategoryName
    amount: float = Field(ge=0)


class SavingsGoal(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0)
    months_to_goal: int = Field(gt=0, le=600)


class DebtPayment(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    balance: float = Field(ge=0)
    minimum_payment: float = Field(ge=0)
    interest_rate: Optional[float] = Field(default=None, ge=0, le=100)


class BudgetInput(BaseModel):
    monthly_income: float = Field(gt=0)
    categories: List[BudgetCategory]
    savings_goals: List[SavingsGoal] = Field(default_factory=list)
    debt_payments: List[DebtPayment] = Field(default_factory=list)

    @field_validator("categories")
    @classmethod
    def require_categories(cls, categories: List[BudgetCategory]) -> List[BudgetCategory]:
        if len(categories) < 5:
            raise ValueError("At least 5 budget categories are required.")
        return categories


class CategoryInsight(BaseModel):
    name: str
    amount: float
    percentage_of_income: float
    status: Literal["low", "healthy", "watch", "high"]


class BudgetAnalysis(BaseModel):
    total_expenses: float
    remaining_cash: float
    savings_target_monthly: float
    total_debt_minimums: float
    savings_rate: float
    debt_to_income_ratio: float
    budget_score: int
    category_insights: List[CategoryInsight]
    recommendations: List[str]
    warnings: List[str]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    budget: BudgetInput
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str]
    used_llm: bool


class HealthResponse(BaseModel):
    status: str
