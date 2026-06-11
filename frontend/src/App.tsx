import { useEffect, useMemo, useState } from 'react';
import { Bot, Github, WalletCards } from 'lucide-react';
import { analyzeBudget, fetchSampleBudget } from './lib/api';
import { BudgetForm } from './components/BudgetForm';
import { Chatbot } from './components/Chatbot';
import { Dashboard } from './components/Dashboard';
import { ProgressTracker } from './components/ProgressTracker';
import type { BudgetAnalysis, BudgetInput } from './types/budget';

const fallbackBudget: BudgetInput = {
  monthly_income: 4200,
  categories: [
    { name: 'housing', amount: 1250 },
    { name: 'food', amount: 520 },
    { name: 'transportation', amount: 300 },
    { name: 'utilities', amount: 210 },
    { name: 'insurance', amount: 180 },
    { name: 'debt', amount: 250 },
    { name: 'entertainment', amount: 280 },
    { name: 'shopping', amount: 340 },
    { name: 'healthcare', amount: 90 },
    { name: 'subscriptions', amount: 70 },
    { name: 'education', amount: 60 },
    { name: 'other', amount: 110 }
  ],
  savings_goals: [
    { name: 'Emergency Fund', target_amount: 5000, current_amount: 1800, months_to_goal: 18 },
    { name: 'Moving Fund', target_amount: 1500, current_amount: 450, months_to_goal: 8 }
  ],
  debt_payments: [
    { name: 'Student Loan', balance: 8500, minimum_payment: 150, interest_rate: 5.2 },
    { name: 'Credit Card', balance: 1200, minimum_payment: 100, interest_rate: 22.5 }
  ]
};

function App() {
  const [budget, setBudget] = useState<BudgetInput>(fallbackBudget);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'offline'>('loading');

  const analyzedBudgetKey = useMemo(() => JSON.stringify(budget), [budget]);

  const loadSample = async () => {
    try {
      const sample = await fetchSampleBudget();
      setBudget(sample);
      setApiStatus('connected');
    } catch {
      setBudget(fallbackBudget);
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    loadSample();
  }, []);

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        const result = await analyzeBudget(budget);
        setAnalysis(result);
        setApiStatus('connected');
      } catch {
        setApiStatus('offline');
      }
    };

    runAnalysis();
  }, [analyzedBudgetKey]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <span className="project-tag"><Bot size={16} /> AI Budgeting Assistant</span>
          <h1>Interactive budget analysis with chatbot explanations.</h1>
          <p>
            A full-stack React, TypeScript, and Python project that analyzes financial data across income,
            expenses, savings goals, debt payments, and spending categories.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#assistant">
              Try the assistant
            </a>
            <a className="secondary-link" href="https://github.com/" target="_blank" rel="noreferrer">
              <Github size={16} /> Push to GitHub
            </a>
          </div>
        </div>
        <div className="hero-card">
          <WalletCards size={34} />
          <span>Backend status</span>
          <strong className={apiStatus}>{apiStatus}</strong>
          <p>FastAPI budget engine + optional LLM chatbot responses.</p>
        </div>
      </header>

      <section className="layout-grid">
        <BudgetForm budget={budget} onBudgetChange={setBudget} onResetSample={loadSample} />
        <div className="main-column">
          <Dashboard analysis={analysis} />
          <ProgressTracker budget={budget} />
          <div id="assistant">
            <Chatbot budget={budget} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
