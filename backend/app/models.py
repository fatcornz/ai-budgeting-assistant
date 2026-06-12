from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

CategoryName = Literal[
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
]


class BudgetCategory(BaseModel):
    name: CategoryName
    amount: float = Field(ge=0)


class SavingsGoal(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0)
    months_to_goal: int = Field(gt=0, le=1200)


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
        if len(categories) < 3:
            raise ValueError("At least 3 budget categories are required.")
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


class AuthRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=8, max_length=128)


class AuthResponse(BaseModel):
    token: str
    username: str


class BudgetProfile(BaseModel):
    id: int
    name: str
    budget: BudgetInput
    created_at: str
    updated_at: str


class BudgetProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    budget: BudgetInput


class BudgetHistoryEntry(BaseModel):
    id: int
    profile_id: int
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    budget: BudgetInput
    analysis: BudgetAnalysis
    created_at: str


class BudgetHistoryCreate(BaseModel):
    profile_id: int
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    budget: BudgetInput


class CsvCategorizeRequest(BaseModel):
    csv_text: str = Field(min_length=1, max_length=200000)


class StatementCategorizeRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=200)
    content_type: str = Field(default="", max_length=120)
    file_data: str = Field(min_length=1, max_length=12000000)


class TransactionCategorySummary(BaseModel):
    name: CategoryName
    amount: float


class CsvCategorizeResponse(BaseModel):
    categories: List[TransactionCategorySummary]
    imported_rows: int
    skipped_rows: int


class LessonSnippet(BaseModel):
    title: str
    topic: str
    content: str


class LessonSearchResponse(BaseModel):
    snippets: List[LessonSnippet]


class ChatEvaluationResult(BaseModel):
    prompt: str
    passed: bool
    notes: str


class ChatEvaluationResponse(BaseModel):
    passed: int
    failed: int
    results: List[ChatEvaluationResult]
