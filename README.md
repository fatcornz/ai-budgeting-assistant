# AI Budgeting Assistant

A full-stack AI budgeting assistant built with **React**, **TypeScript**, **Python**, **FastAPI**, and an optional **LLM-powered chatbot**. The app analyzes a user's financial profile across income, expenses, savings goals, debt payments, spending categories, transaction imports, and month-over-month history.

## Features

- Interactive budget form that starts with 3 common categories and lets users add more from a common-first dropdown
- Budget analysis across income, expenses, savings goals, debt payments, and category-level spending
- AI chatbot UI for budget questions and spending tradeoff explanations
- Optional OpenAI API support with rule-based fallback when no API key is provided
- Browser-saved budget and chat memory using localStorage so users do not lose edits after refresh
- Budget JSON export/import for free backups or moving data to another browser
- Account registration and login for saving budget profiles
- SQLite profile storage by default, with PostgreSQL support through `DATABASE_URL`
- Month-over-month budget history snapshots and a 12-month savings progression tracker
- Merchant-aware bank statement upload with automatic spending-category totals for CSV, PDF, XLSX, OFX/QFX/QBO, text, and HTML files
- Editable imported category totals plus month-over-month dollar and percent category changes
- Financial literacy lesson snippets used by the assistant and available through the API
- Automated chatbot evaluation endpoint for checking response quality
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
├── requirements.txt
└── README.md
```

## Tech Stack

**Frontend:** React, TypeScript, Vite, CSS, Lucide icons  
**Backend:** Python, FastAPI, Pydantic, SQLAlchemy, SQLite/PostgreSQL  
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
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=sqlite:///backend/budget_assistant.db
```

For PostgreSQL, use a URL such as:

```bash
DATABASE_URL=postgresql+psycopg://user:password@host:5432/ai_budgeting_assistant
```

### 3. Run the backend

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --app-dir backend
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

Your budget and chat thread are saved automatically in the browser you use. Use the **Export** button in the Budget Profile panel to download a JSON backup, and **Import** to restore it later or move it to another computer.

If your terminal says `zsh: command not found: npm`, install Node.js first from https://nodejs.org. Then close and reopen Terminal, return to the project, and rerun the frontend commands. The Python virtual environment is only for the backend; it does not install `npm`.

If your prompt already ends in `frontend %`, do not run `cd frontend` again. You are already inside that folder.

## Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

Then open:

```text
http://localhost:5173
```

## Dependency Files

- Python backend packages live in `backend/requirements.txt`.
- The root `requirements.txt` points to the backend dependency file, so `pip install -r requirements.txt` works from the project root.
- Frontend packages live in `frontend/package.json` and are installed with `npm install`.
- Whenever a new Python package is added, add it to `backend/requirements.txt`. Whenever a new React/TypeScript library is added, add it to `frontend/package.json`.

## Free Local Sharing and Hosting Notes

For normal use, the app is fully free on your machine at `http://localhost:5173`.

To try it on another device on the same Wi-Fi, run the backend and frontend, then open the Vite network URL shown in the frontend terminal, usually:

```text
http://YOUR_LOCAL_IP:5173
```

For a public free URL, the most practical no-card path is:

1. Deploy the frontend to Vercel, Netlify, Render Static Sites, or GitHub Pages.
2. Deploy the FastAPI backend to Render Free Web Service or another free Python host.
3. Set the frontend environment variable:

```text
VITE_API_BASE_URL=https://your-backend-url
```

4. Set the backend `ALLOWED_ORIGINS` value to your frontend URL.

Important: a truly custom domain like `yourname.com` usually requires buying the domain. Free hosts normally provide a free subdomain, such as a `vercel.app`, `onrender.com`, `netlify.app`, or `github.io` URL. Browser-saved memory is per browser/device, while signed-in profiles are saved through the backend database.

## Deploy On AWS

The simplest AWS path is to run the FastAPI backend separately from the Vite frontend:

1. Deploy the backend with AWS Elastic Beanstalk using the `backend` folder and the Docker platform.
2. Set backend environment variables in Elastic Beanstalk:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=postgresql+psycopg://user:password@rds-host:5432/ai_budgeting_assistant
ALLOWED_ORIGINS=https://your-amplify-domain
```

3. Use Amazon RDS PostgreSQL for durable saved profiles and budget history.
4. Deploy the frontend with AWS Amplify Hosting from the repo root. The included `amplify.yml` tells Amplify to build the `frontend` app and publish `frontend/dist`.
5. Set this Amplify environment variable:

```text
VITE_API_BASE_URL=https://your-elastic-beanstalk-backend-url
```

6. Redeploy the backend after you know the final Amplify URL, because that URL must be included in `ALLOWED_ORIGINS`.
7. Use an HTTPS backend URL with the Amplify frontend. If Elastic Beanstalk is only serving HTTP, add HTTPS with AWS Certificate Manager and a load balancer before using it from the deployed frontend.

For local upload errors that say the app cannot reach the backend, make sure the backend is running and use matching hostnames such as `http://localhost:5173` with `http://localhost:8000`, or `http://127.0.0.1:5173` with `http://127.0.0.1:8000`.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/sample-budget` | Loads sample budget data |
| POST | `/api/analyze` | Returns budget metrics, warnings, recommendations, and category insights |
| POST | `/api/chat` | Returns chatbot response and suggested actions |
| POST | `/api/auth/register` | Creates an account |
| POST | `/api/auth/login` | Logs in and returns an auth token |
| GET | `/api/profiles` | Lists saved budget profiles for the signed-in user |
| POST | `/api/profiles` | Saves a budget profile |
| PUT | `/api/profiles/{profile_id}` | Updates a saved budget profile |
| GET | `/api/profiles/{profile_id}/history` | Lists monthly budget snapshots |
| POST | `/api/history` | Saves a monthly budget snapshot |
| POST | `/api/csv/categorize` | Converts transaction CSV rows into category totals |
| POST | `/api/statements/categorize` | Converts uploaded statement document content into category totals |
| GET | `/api/lessons` | Searches financial literacy snippets |
| POST | `/api/evaluations/chatbot` | Runs chatbot response quality checks |

## Example Chat Prompts

- Where should I cut spending first?
- How can I reach my savings goal faster?
- Is my debt payment manageable?
- Explain the biggest tradeoff in this budget.
- What category should I monitor most closely?

## Implemented Improvements

- User authentication
- Stored budget profiles
- Month-over-month budget history
- Bank statement document upload for transaction categorization
- Financial literacy snippet retrieval for chatbot context
- Automated chatbot evaluation checks
- Deployment configuration notes for separate frontend and backend hosting

## Important Note

This app is an educational budgeting tool. It should not be treated as professional financial, investment, legal, or tax advice.
