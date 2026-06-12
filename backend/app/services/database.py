from __future__ import annotations

import hashlib
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Column, ForeignKey, Integer, MetaData, String, Table, Text, create_engine, select
from sqlalchemy.engine import Engine, RowMapping
from sqlalchemy.exc import IntegrityError

from app.models import AuthResponse, BudgetAnalysis, BudgetHistoryEntry, BudgetInput, BudgetProfile
from app.services.budget_analyzer import analyze_budget

DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "budget_assistant.db"

metadata = MetaData()

users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("username", String(40), nullable=False, unique=True),
    Column("password_hash", String(64), nullable=False),
    Column("salt", String(32), nullable=False),
    Column("token", String(128), nullable=False, unique=True),
    Column("created_at", String(40), nullable=False),
)

budget_profiles = Table(
    "budget_profiles",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("name", String(80), nullable=False),
    Column("budget_json", Text, nullable=False),
    Column("created_at", String(40), nullable=False),
    Column("updated_at", String(40), nullable=False),
)

budget_history = Table(
    "budget_history",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
    Column("profile_id", Integer, ForeignKey("budget_profiles.id"), nullable=False),
    Column("month", String(7), nullable=False),
    Column("budget_json", Text, nullable=False),
    Column("analysis_json", Text, nullable=False),
    Column("created_at", String(40), nullable=False),
)


def init_db() -> None:
    metadata.create_all(_engine())


def register_user(username: str, password: str) -> AuthResponse:
    normalized_username = username.strip().lower()
    salt = secrets.token_hex(16)
    token = secrets.token_urlsafe(32)
    try:
        with _engine().begin() as conn:
            conn.execute(
                users.insert().values(
                    username=normalized_username,
                    password_hash=_hash_password(password, salt),
                    salt=salt,
                    token=token,
                    created_at=_now(),
                )
            )
    except IntegrityError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already registered.") from exc
    return AuthResponse(token=token, username=normalized_username)


def login_user(username: str, password: str) -> AuthResponse:
    user = _get_user_by_username(username.strip().lower())
    if not user or user["password_hash"] != _hash_password(password, user["salt"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")
    return AuthResponse(token=user["token"], username=user["username"])


def get_user_id_from_token(token: str) -> int:
    with _engine().connect() as conn:
        row = conn.execute(select(users.c.id).where(users.c.token == token)).mappings().fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    return int(row["id"])


def list_profiles(user_id: int) -> list[BudgetProfile]:
    with _engine().connect() as conn:
        rows = conn.execute(
            select(
                budget_profiles.c.id,
                budget_profiles.c.name,
                budget_profiles.c.budget_json,
                budget_profiles.c.created_at,
                budget_profiles.c.updated_at,
            )
            .where(budget_profiles.c.user_id == user_id)
            .order_by(budget_profiles.c.updated_at.desc())
        ).mappings().fetchall()
    return [_profile_from_row(row) for row in rows]


def save_profile(user_id: int, name: str, budget: BudgetInput) -> BudgetProfile:
    now = _now()
    with _engine().begin() as conn:
        result = conn.execute(
            budget_profiles.insert().values(
                user_id=user_id,
                name=name,
                budget_json=budget.model_dump_json(),
                created_at=now,
                updated_at=now,
            )
        )
        profile_id = int(result.inserted_primary_key[0])
    return _get_profile(user_id, profile_id)


def update_profile(user_id: int, profile_id: int, name: str, budget: BudgetInput) -> BudgetProfile:
    with _engine().begin() as conn:
        result = conn.execute(
            budget_profiles.update()
            .where(budget_profiles.c.id == profile_id, budget_profiles.c.user_id == user_id)
            .values(name=name, budget_json=budget.model_dump_json(), updated_at=_now())
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget profile was not found.")
    return _get_profile(user_id, profile_id)


def add_history(user_id: int, profile_id: int, month: str, budget: BudgetInput) -> BudgetHistoryEntry:
    _require_profile(user_id, profile_id)
    analysis = analyze_budget(budget)
    now = _now()
    with _engine().begin() as conn:
        result = conn.execute(
            budget_history.insert().values(
                user_id=user_id,
                profile_id=profile_id,
                month=month,
                budget_json=budget.model_dump_json(),
                analysis_json=analysis.model_dump_json(),
                created_at=now,
            )
        )
        history_id = int(result.inserted_primary_key[0])
    return BudgetHistoryEntry(
        id=history_id,
        profile_id=profile_id,
        month=month,
        budget=budget,
        analysis=analysis,
        created_at=now,
    )


def list_history(user_id: int, profile_id: int) -> list[BudgetHistoryEntry]:
    _require_profile(user_id, profile_id)
    with _engine().connect() as conn:
        rows = conn.execute(
            select(
                budget_history.c.id,
                budget_history.c.profile_id,
                budget_history.c.month,
                budget_history.c.budget_json,
                budget_history.c.analysis_json,
                budget_history.c.created_at,
            )
            .where(budget_history.c.user_id == user_id, budget_history.c.profile_id == profile_id)
            .order_by(budget_history.c.month.desc(), budget_history.c.created_at.desc())
        ).mappings().fetchall()
    return [_history_from_row(row) for row in rows]


def _engine() -> Engine:
    database_url = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    if database_url.startswith("sqlite:///"):
        db_path = database_url.replace("sqlite:///", "", 1)
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(database_url)


def _get_user_by_username(username: str) -> RowMapping | None:
    with _engine().connect() as conn:
        return conn.execute(select(users).where(users.c.username == username)).mappings().fetchone()


def _get_profile(user_id: int, profile_id: int) -> BudgetProfile:
    with _engine().connect() as conn:
        row = conn.execute(
            select(
                budget_profiles.c.id,
                budget_profiles.c.name,
                budget_profiles.c.budget_json,
                budget_profiles.c.created_at,
                budget_profiles.c.updated_at,
            ).where(budget_profiles.c.id == profile_id, budget_profiles.c.user_id == user_id)
        ).mappings().fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget profile was not found.")
    return _profile_from_row(row)


def _require_profile(user_id: int, profile_id: int) -> None:
    _get_profile(user_id, profile_id)


def _profile_from_row(row: RowMapping) -> BudgetProfile:
    data = dict(row)
    return BudgetProfile(
        id=data["id"],
        name=data["name"],
        budget=BudgetInput(**json.loads(data["budget_json"])),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


def _history_from_row(row: RowMapping) -> BudgetHistoryEntry:
    data: dict[str, Any] = dict(row)
    return BudgetHistoryEntry(
        id=data["id"],
        profile_id=data["profile_id"],
        month=data["month"],
        budget=BudgetInput(**json.loads(data["budget_json"])),
        analysis=BudgetAnalysis(**json.loads(data["analysis_json"])),
        created_at=data["created_at"],
    )


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
