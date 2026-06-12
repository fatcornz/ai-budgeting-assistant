import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, HardDrive, WalletCards } from 'lucide-react';
import { analyzeBudget, fetchSampleBudget } from './lib/api';
import { AccountPanel } from './components/AccountPanel';
import { BudgetForm } from './components/BudgetForm';
import { Chatbot } from './components/Chatbot';
import { Dashboard } from './components/Dashboard';
import { PlanningTools } from './components/PlanningTools';
import { ProgressTracker } from './components/ProgressTracker';
import { clearSavedBudget, clearSavedChat, loadSavedBudget, saveBudget } from './lib/storage';
import { CATEGORY_OPTIONS, STARTER_CATEGORIES, type BudgetAnalysis, type BudgetInput } from './types/budget';

const fallbackBudget: BudgetInput = {
  monthly_income: 4200,
  categories: [
    { name: 'housing', amount: 1250 },
    { name: 'food', amount: 520 },
    { name: 'transportation', amount: 300 }
  ],
  savings_goals: [
    { name: 'Annual Savings Goal', target_amount: 12000, current_amount: 1800, months_to_goal: 12 },
    { name: 'Emergency Fund', target_amount: 5000, current_amount: 1800, months_to_goal: 18 }
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

  const applyImportedCategories = (categories: BudgetInput['categories']) => {
    const imported = new Map(categories.map((category) => [category.name, category.amount]));
    const names = CATEGORY_OPTIONS.filter((name) => STARTER_CATEGORIES.includes(name) || imported.has(name));
    setBudget({
      ...budget,
      categories: names.map((name) => ({
        name,
        amount: imported.get(name) ?? 0
      }))
    });
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <span className="project-tag"><Bot size={16} /> AI Budgeting Assistant</span>
          <h1>Build a budget you can keep using.</h1>
          <p>
            Enter income, spending, savings goals, and debt payments. Track monthly progress, annual goals,
            imported statement totals, and the tradeoffs that matter over time.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#assistant">
              Try the assistant
            </a>
          </div>
        </div>
        <div className="hero-card">
          <WalletCards size={34} />
          <span>App status</span>
          <strong className={apiStatus}>{apiStatus}</strong>
          <p>Budget analysis, profile saving, imports, and assistant chat.</p>
          <span className="storage-status">
            <HardDrive size={15} /> Local memory {saveStatus}
          </span>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Budget workspace sections">
        <a href="#budget-profile">Budget</a>
        <a href="#budget-spending">Spending</a>
        <a href="#budget-goals">Goals</a>
        <a href="#budget-debt">Debt</a>
        <a href="#dashboard">Dashboard</a>
        <a href="#tracker">Tracker</a>
        <a href="#bank-import">Import</a>
        <a href="#assistant">Assistant</a>
      </nav>

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
          <AccountPanel budget={budget} onBudgetChange={setBudget} />
          <Dashboard analysis={analysis} />
          <ProgressTracker budget={budget} />
          <PlanningTools budget={budget} onApplyCategories={applyImportedCategories} />
          <div id="assistant" className="section-anchor">
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
    candidate.categories.length >= STARTER_CATEGORIES.length &&
    candidate.categories.every((category) => typeof category.name === 'string' && typeof category.amount === 'number') &&
    Array.isArray(candidate.savings_goals) &&
    Array.isArray(candidate.debt_payments)
  );
}
