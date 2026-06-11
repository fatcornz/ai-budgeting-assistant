from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import BudgetAnalysis, BudgetInput, ChatRequest, ChatResponse, HealthResponse
from app.services.budget_analyzer import analyze_budget
from app.services.chat_service import generate_chat_response

load_dotenv()

app = FastAPI(
    title="AI Budgeting Assistant API",
    description="Budget analysis and chatbot API for a React + TypeScript budgeting dashboard.",
    version="1.0.0",
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
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
