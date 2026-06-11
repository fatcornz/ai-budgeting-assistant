import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, HardDrive, WalletCards } from 'lucide-react';
import { analyzeBudget, fetchSampleBudget } from './lib/api';
import { BudgetForm } from './components/BudgetForm';
import { Chatbot } from './components/Chatbot';
import { Dashboard } from './components/Dashboard';
import { ProgressTracker } from './components/ProgressTracker';
import { clearSavedBudget, clearSavedChat, loadSavedBudget, saveBudget } from './lib/storage';
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
  const [budget, setBudget] = useState<BudgetInput>(() => loadSavedBudget() ?? fallbackBudget);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'offline'>('loading');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const hasSavedBudget = useRef(loadSavedBudget() !== null);

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
    if (!hasSavedBudget.current) {
      loadSample();
    }
  }, []);

  useEffect(() => {
    setSaveStatus('saving');
    saveBudget(budget);
    const timer = window.setTimeout(() => setSaveStatus('saved'), 350);
    return () => window.clearTimeout(timer);
  }, [analyzedBudgetKey, budget]);

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

  const exportBudget = () => {
    const data = JSON.stringify(budget, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBudget = async (file: File) => {
    const importedBudget = JSON.parse(await file.text()) as BudgetInput;
    if (!isBudgetInput(importedBudget)) {
      throw new Error('Invalid budget backup');
    }
    setBudget(importedBudget);
  };

  const clearLocalData = () => {
    clearSavedBudget();
    clearSavedChat();
    setBudget(fallbackBudget);
  };

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
              Push to GitHub
            </a>
          </div>
        </div>
        <div className="hero-card">
          <WalletCards size={34} />
          <span>Backend status</span>
          <strong className={apiStatus}>{apiStatus}</strong>
          <p>FastAPI budget engine + optional LLM chatbot responses.</p>
          <span className="storage-status">
            <HardDrive size={15} /> Local memory {saveStatus}
          </span>
        </div>
      </header>

      <section className="layout-grid">
        <BudgetForm
          budget={budget}
          onBudgetChange={setBudget}
          onResetSample={loadSample}
          onExportBudget={exportBudget}
          onImportBudget={importBudget}
          onClearLocalData={clearLocalData}
          saveStatus={saveStatus}
        />
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

function isBudgetInput(value: unknown): value is BudgetInput {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as BudgetInput;
  return (
    typeof candidate.monthly_income === 'number' &&
    Array.isArray(candidate.categories) &&
    candidate.categories.length >= 5 &&
    candidate.categories.every((category) => typeof category.name === 'string' && typeof category.amount === 'number') &&
    Array.isArray(candidate.savings_goals) &&
    Array.isArray(candidate.debt_payments)
  );
}
