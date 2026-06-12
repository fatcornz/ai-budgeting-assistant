# User Guide

This guide explains how to set up and use AI Budgeting Assistant on your computer.

## Local Setup

1. Install Python 3.11 or newer.
2. Install Node.js from https://nodejs.org.
3. Open a terminal in the project folder.
4. Create the environment file:

```bash
cp .env.example .env
```

5. Start the backend:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --app-dir backend
```

6. Open a second terminal and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

7. Open the app:

```text
http://localhost:5173
```

The API documentation is available at:

```text
http://localhost:8000/docs
```

## Optional Chatbot Setup

The app works without an OpenAI API key by using built-in budgeting rules. To enable LLM-powered responses, edit `.env`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Restart the backend after changing `.env`.

## Database Setup

The default database setting stores account profiles in a local SQLite file:

```bash
DATABASE_URL=sqlite:///backend/budget_assistant.db
```

For a hosted PostgreSQL database, replace it with a PostgreSQL URL:

```bash
DATABASE_URL=postgresql+psycopg://user:password@host:5432/ai_budgeting_assistant
```

The backend creates the required tables when it starts.

## How To Use The App

1. Enter monthly income in the Budget Profile panel.
2. Add or edit spending categories.
3. Add savings goals with a target amount, current amount, and timeline.
4. Add debt payments with balances, minimum payments, and interest rates.
5. Review the dashboard for budget score, remaining cash, warnings, and recommendations.
6. Ask the Budget Coach Chat questions about savings, debt, spending cuts, or tradeoffs.

## Save And Restore Budgets

- The app automatically saves budget and chat data in the browser.
- Use Export to download a JSON backup.
- Use Import to restore a JSON backup.
- Create an account in the Account panel to save budget profiles in the backend database.
- Use Save month snapshot to store a month-over-month history entry.

## Bank Statement Import

Use the statement upload tool to turn bank transaction rows into spending-category totals.
Supported file types include CSV, TSV, TXT, PDF, XLSX, OFX, QFX, QBO, HTML, and HTM.
PDF parsing works best with text-based statements; scanned image-only PDFs may not contain readable transaction text.
Files must be under 6 MB.

Recommended CSV columns:

```text
date,description,amount,category
2026-06-01,Rent,1250,housing
2026-06-02,Grocery Store,86.42,food
```

The `category` column is optional. If it is missing, the app guesses categories from the transaction description.
The importer looks at the merchant or purchase name first, then the amount direction. For example, food delivery should land in Food & Drinks, ride-share trips in Transportation, stores in Shopping, streaming or tickets in Entertainment, and repairs or cleaning in Services.
After import, review the preview totals. You can edit amounts, change categories, remove rows, or add a missing category before choosing Apply categories.

## Monthly Category Changes

If you are signed in, use Save month snapshot once per month. After at least two monthly snapshots, the Account panel shows each category that changed, including the dollar change and percentage change from the previous saved month.

## Deploy On AWS

Recommended simple AWS setup:

1. Deploy the backend to AWS Elastic Beanstalk using the `backend` folder and the Docker platform.
2. Add backend environment variables in Elastic Beanstalk:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=postgresql+psycopg://user:password@rds-host:5432/ai_budgeting_assistant
ALLOWED_ORIGINS=https://your-amplify-domain
```

3. Use Amazon RDS PostgreSQL for saved accounts and budget history. SQLite is fine for testing, but hosted profile data should use RDS.
4. Deploy the frontend to AWS Amplify Hosting from the repo root. The included `amplify.yml` builds the `frontend` app.
5. Add this Amplify environment variable:

```text
VITE_API_BASE_URL=https://your-elastic-beanstalk-backend-url
```

6. After Amplify gives you a frontend URL, add that exact URL to backend `ALLOWED_ORIGINS`, then restart or redeploy the backend.
7. Use an HTTPS backend URL for the deployed frontend. If your Elastic Beanstalk backend is only HTTP, add HTTPS with an AWS Certificate Manager certificate and a load balancer before using it from Amplify.

## Troubleshooting

- If the frontend cannot connect, make sure the backend is running at `http://localhost:8000`.
- If upload says it could not reach the backend, open the app and backend with matching local hostnames, such as `http://localhost:5173` and `http://localhost:8000`, or restart the backend with the updated `ALLOWED_ORIGINS`.
- If a PDF imports no rows, try exporting the statement as CSV, OFX, QFX, or QBO. Image-only PDFs need OCR and may not contain readable transaction text.
- If `npm` is not found, install Node.js, close Terminal, reopen it, and try again.
- If account data does not appear, sign in again and check that `DATABASE_URL` is set in `.env`.
- If LLM chat does not turn on, confirm `OPENAI_API_KEY` is set and restart the backend.
