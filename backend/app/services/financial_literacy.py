from __future__ import annotations

from app.models import LessonSnippet

LESSON_SNIPPETS = [
    LessonSnippet(
        title="Emergency Fund Basics",
        topic="savings",
        content="An emergency fund helps cover surprise costs without relying on high-interest debt. A starter goal of one month of essential expenses can make the plan more resilient.",
    ),
    LessonSnippet(
        title="Debt Avalanche",
        topic="debt",
        content="The debt avalanche method puts extra payments toward the highest-interest balance first while minimums continue on every debt.",
    ),
    LessonSnippet(
        title="Needs, Wants, and Goals",
        topic="spending",
        content="Separating needs, wants, and goals makes tradeoffs easier because flexible categories can be adjusted before essential bills are affected.",
    ),
    LessonSnippet(
        title="Savings Rate",
        topic="savings",
        content="Savings rate compares planned monthly savings with monthly income. Raising it gradually can be easier than making one large cut.",
    ),
    LessonSnippet(
        title="Month-over-Month Review",
        topic="history",
        content="Monthly snapshots show whether a budget is improving, drifting, or staying steady. Trends are often more useful than a single score.",
    ),
]


def search_lessons(query: str, limit: int = 3) -> list[LessonSnippet]:
    terms = [term for term in query.lower().split() if len(term) > 2]
    scored: list[tuple[int, LessonSnippet]] = []
    for snippet in LESSON_SNIPPETS:
        text = f"{snippet.title} {snippet.topic} {snippet.content}".lower()
        score = sum(text.count(term) for term in terms)
        if score:
            scored.append((score, snippet))

    if not scored:
        return LESSON_SNIPPETS[:limit]

    return [snippet for _, snippet in sorted(scored, key=lambda item: item[0], reverse=True)[:limit]]
