from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    AuthRequest,
    AuthResponse,
    BudgetAnalysis,
    BudgetHistoryCreate,
    BudgetHistoryEntry,
    BudgetInput,
    BudgetProfile,
    BudgetProfileCreate,
    ChatEvaluationResponse,
    ChatEvaluationResult,
    ChatRequest,
    ChatResponse,
    CsvCategorizeRequest,
    CsvCategorizeResponse,
    HealthResponse,
    LessonSearchResponse,
    StatementCategorizeRequest,
)
from app.services.csv_importer import categorize_csv, categorize_statement_document
from app.services.database import (
    add_history,
    get_user_id_from_token,
    init_db,
    list_history,
    list_profiles,
    login_user,
    register_user,
    save_profile,
    update_profile,
)
from app.services.budget_analyzer import analyze_budget
from app.services.chat_service import generate_chat_response
from app.services.financial_literacy import search_lessons

load_dotenv()

app = FastAPI(
    title="AI Budgeting Assistant API",
    description="Budget analysis and chatbot API for a React + TypeScript budgeting dashboard.",
    version="1.0.0",
)

init_db()


def current_user_id(authorization: str = Header(default="")) -> int:
    token = authorization.removeprefix("Bearer ").strip()
    return get_user_id_from_token(token)

default_allowed_origins = "http://localhost:5173,http://127.0.0.1:5173"
allowed_origins = os.getenv("ALLOWED_ORIGINS", default_allowed_origins).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/sample-budget", response_model=BudgetInput)
def sample_budget() -> BudgetInput:
    sample_path = Path(__file__).parent / "data" / "sample_budget.json"
    with sample_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return BudgetInput(**data)


@app.post("/api/analyze", response_model=BudgetAnalysis)
def analyze(payload: BudgetInput) -> BudgetAnalysis:
    return analyze_budget(payload)


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    return generate_chat_response(
        message=payload.message,
        budget=payload.budget,
        history=payload.history,
    )


@app.post("/api/auth/register", response_model=AuthResponse)
def register(payload: AuthRequest) -> AuthResponse:
    return register_user(payload.username, payload.password)


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: AuthRequest) -> AuthResponse:
    return login_user(payload.username, payload.password)


@app.get("/api/profiles", response_model=list[BudgetProfile])
def profiles(user_id: int = Depends(current_user_id)) -> list[BudgetProfile]:
    return list_profiles(user_id)


@app.post("/api/profiles", response_model=BudgetProfile)
def create_profile(payload: BudgetProfileCreate, user_id: int = Depends(current_user_id)) -> BudgetProfile:
    return save_profile(user_id, payload.name, payload.budget)


@app.put("/api/profiles/{profile_id}", response_model=BudgetProfile)
def replace_profile(
    profile_id: int,
    payload: BudgetProfileCreate,
    user_id: int = Depends(current_user_id),
) -> BudgetProfile:
    return update_profile(user_id, profile_id, payload.name, payload.budget)


@app.get("/api/profiles/{profile_id}/history", response_model=list[BudgetHistoryEntry])
def history(profile_id: int, user_id: int = Depends(current_user_id)) -> list[BudgetHistoryEntry]:
    return list_history(user_id, profile_id)


@app.post("/api/history", response_model=BudgetHistoryEntry)
def create_history(payload: BudgetHistoryCreate, user_id: int = Depends(current_user_id)) -> BudgetHistoryEntry:
    return add_history(user_id, payload.profile_id, payload.month, payload.budget)


@app.post("/api/csv/categorize", response_model=CsvCategorizeResponse)
def csv_categorize(payload: CsvCategorizeRequest) -> CsvCategorizeResponse:
    return categorize_csv(payload.csv_text)


@app.post("/api/statements/categorize", response_model=CsvCategorizeResponse)
def statement_categorize(payload: StatementCategorizeRequest) -> CsvCategorizeResponse:
    try:
        return categorize_statement_document(payload.file_name, payload.content_type, payload.file_data)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/lessons", response_model=LessonSearchResponse)
def lessons(q: str = "budget") -> LessonSearchResponse:
    return LessonSearchResponse(snippets=search_lessons(q))


@app.post("/api/evaluations/chatbot", response_model=ChatEvaluationResponse)
def evaluate_chatbot(payload: BudgetInput) -> ChatEvaluationResponse:
    prompts = [
        "Where should I cut spending first?",
        "How can I improve savings?",
        "Is my debt manageable?",
    ]
    results: list[ChatEvaluationResult] = []
    for prompt in prompts:
        response = generate_chat_response(prompt, payload, [])
        reply = response.reply.lower()
        passed = (
            str(analyze_budget(payload).budget_score) in reply
            and "advisor" not in reply
            and len(response.suggested_actions) > 0
        )
        results.append(
            ChatEvaluationResult(
                prompt=prompt,
                passed=passed,
                notes="Includes budget-specific context and suggested actions." if passed else "Response needs more budget-specific context.",
            )
        )
    passed_count = sum(1 for result in results if result.passed)
    return ChatEvaluationResponse(passed=passed_count, failed=len(results) - passed_count, results=results)
