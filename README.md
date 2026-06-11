# AI Budgeting Assistant

A full-stack AI budgeting assistant built with **React**, **TypeScript**, **Python**, **FastAPI**, and an optional **LLM-powered chatbot**. The app analyzes a user's financial profile across five core areas: income, expenses, savings goals, debt payments, and spending categories.

This project is designed to be resume-friendly and GitHub-ready. It includes a polished chatbot UI, backend budgeting logic, progress tracking, category visualizations, API routes, tests, Docker support, and setup instructions.

## Features

- Interactive budget form with 10+ spending categories
- Budget analysis across income, expenses, savings goals, debt payments, and category-level spending
- AI chatbot UI for budget questions and spending tradeoff explanations
- Optional OpenAI API support with rule-based fallback when no API key is provided
- Progress tracking for savings goals
- Data visualization for category spending trends
- FastAPI backend with typed Pydantic models
- React + TypeScript frontend using Vite
- Docker Compose for local full-stack execution
- Pytest backend test example

## Project Structure

```text
ai-budgeting-assistant/
├── backend/
│   ├── app/
│   │   ├── data/sample_budget.json
│   │   ├── services/budget_analyzer.py
│   │   ├── services/chat_service.py
│   │   ├── main.py
│   │   └── models.py
│   ├── tests/test_budget_analyzer.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/api.ts
│   │   ├── types/budget.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Tech Stack

**Frontend:** React, TypeScript, Vite, CSS, Lucide icons  
**Backend:** Python, FastAPI, Pydantic  
**AI:** Optional OpenAI API integration with rule-based fallback  
**Testing:** Pytest  
**Deployment-ready:** Docker and Docker Compose

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-budgeting-assistant.git
cd ai-budgeting-assistant
```

### 2. Create environment file

```bash
cp .env.example .env
```

The app works without an OpenAI key because it has a rule-based fallback. To enable LLM responses, add your key:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

### 3. Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at:

```text
http://localhost:8000
```

API docs run at:

```text
http://localhost:8000/docs
```

### 4. Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

Then open:

```text
http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/sample-budget` | Loads sample budget data |
| POST | `/api/analyze` | Returns budget metrics, warnings, recommendations, and category insights |
| POST | `/api/chat` | Returns chatbot response and suggested actions |

## Example Chat Prompts

- Where should I cut spending first?
- How can I reach my savings goal faster?
- Is my debt payment manageable?
- Explain the biggest tradeoff in this budget.
- What category should I monitor most closely?

## Resume Bullets

Use these on your resume after pushing the project:

- Developed a full-stack AI budgeting assistant using React, TypeScript, Python, and FastAPI to analyze user financial data across income, expenses, savings goals, debt payments, and 10+ spending categories.
- Implemented a chatbot-style budgeting coach with optional LLM integration and rule-based fallback to generate realistic suggestions, explain spending tradeoffs, and surface actionable savings/debt recommendations.
- Built progress tracking and category visualization features to monitor spending trends, savings progress, cash flow, and budgeting behavior through an interactive dashboard.

## Future Improvements

- Add user authentication
- Store budget profiles in PostgreSQL
- Add month-over-month budget history
- Add CSV upload for bank transaction categorization
- Add RAG over financial literacy lesson snippets
- Add automated evaluation tests for chatbot response quality
- Deploy frontend to Vercel and backend to Render, Railway, Azure, or AWS

## Important Note

This app is an educational budgeting tool. It should not be treated as professional financial, investment, legal, or tax advice.
