import { ChangeEvent, useRef, useState } from 'react';
import { Download, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import type { BudgetCategory, BudgetInput, CategoryName, DebtPayment, SavingsGoal } from '../types/budget';

const CATEGORY_OPTIONS: CategoryName[] = [
  'housing',
  'food',
  'transportation',
  'utilities',
  'insurance',
  'debt',
  'entertainment',
  'shopping',
  'healthcare',
  'subscriptions',
  'education',
  'other'
];

interface BudgetFormProps {
  budget: BudgetInput;
  onBudgetChange: (budget: BudgetInput) => void;
  onResetSample: () => void;
  onExportBudget: () => void;
  onImportBudget: (file: File) => Promise<void>;
  onClearLocalData: () => void;
  saveStatus: 'saved' | 'saving';
}

export function BudgetForm({
  budget,
  onBudgetChange,
  onResetSample,
  onExportBudget,
  onImportBudget,
  onClearLocalData,
  saveStatus
}: BudgetFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState('');

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await onImportBudget(file);
      setImportError('');
    } catch {
      setImportError('That file could not be imported. Choose a budget JSON backup from this app.');
    } finally {
      event.target.value = '';
    }
  };

  const updateIncome = (monthlyIncome: number) => {
    onBudgetChange({ ...budget, monthly_income: monthlyIncome });
  };

  const updateCategory = (index: number, updates: Partial<BudgetCategory>) => {
    const categories = budget.categories.map((category, currentIndex) =>
      currentIndex === index ? { ...category, ...updates } : category
    );
    onBudgetChange({ ...budget, categories });
  };

  const addCategory = () => {
    onBudgetChange({
      ...budget,
      categories: [...budget.categories, { name: 'other', amount: 0 }]
    });
  };

  const removeCategory = (index: number) => {
    if (budget.categories.length <= 5) return;
    onBudgetChange({
      ...budget,
      categories: budget.categories.filter((_, currentIndex) => currentIndex !== index)
    });
  };

  const updateGoal = (index: number, updates: Partial<SavingsGoal>) => {
    onBudgetChange({
      ...budget,
      savings_goals: budget.savings_goals.map((goal, currentIndex) =>
        currentIndex === index ? { ...goal, ...updates } : goal
      )
    });
  };

  const addGoal = () => {
    onBudgetChange({
      ...budget,
      savings_goals: [
        ...budget.savings_goals,
        { name: 'New Goal', target_amount: 1000, current_amount: 0, months_to_goal: 12 }
      ]
    });
  };

  const removeGoal = (index: number) => {
    onBudgetChange({
      ...budget,
      savings_goals: budget.savings_goals.filter((_, currentIndex) => currentIndex !== index)
    });
  };

  const updateDebt = (index: number, updates: Partial<DebtPayment>) => {
    onBudgetChange({
      ...budget,
      debt_payments: budget.debt_payments.map((debt, currentIndex) =>
        currentIndex === index ? { ...debt, ...updates } : debt
      )
    });
  };

  const addDebt = () => {
    onBudgetChange({
      ...budget,
      debt_payments: [
        ...budget.debt_payments,
        { name: 'New Debt', balance: 0, minimum_payment: 0, interest_rate: 0 }
      ]
    });
  };

  const removeDebt = (index: number) => {
    onBudgetChange({
      ...budget,
      debt_payments: budget.debt_payments.filter((_, currentIndex) => currentIndex !== index)
    });
  };

  return (
    <section className="panel budget-form">
      <div className="section-header">
        <div>
          <span className="eyebrow">Input</span>
          <h2>Budget Profile</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onResetSample}>
          <RotateCcw size={16} /> Sample data
        </button>
      </div>

      <div className="memory-panel">
        <div>
          <span className="memory-label">
            <Save size={15} /> Local memory
          </span>
          <strong>{saveStatus === 'saved' ? 'Saved in this browser' : 'Saving...'}</strong>
        </div>
        <div className="memory-actions">
          <button className="icon-label-button" type="button" onClick={onExportBudget}>
            <Download size={15} /> Export
          </button>
          <button className="icon-label-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> Import
          </button>
          <button className="text-button inline" type="button" onClick={onClearLocalData}>
            Clear
          </button>
        </div>
        <input ref={fileInputRef} className="sr-only" type="file" accept="application/json" onChange={handleImport} />
        {importError && <p className="form-error">{importError}</p>}
      </div>

      <label className="input-label">
        Monthly income
        <input
          type="number"
          min="1"
          value={budget.monthly_income}
          onChange={(event) => updateIncome(Number(event.target.value))}
        />
      </label>

      <div className="subsection-title">
        <h3>Spending categories</h3>
        <button className="small-button" type="button" onClick={addCategory}>
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="scroll-list">
        {budget.categories.map((category, index) => (
          <div className="grid-row" key={`${category.name}-${index}`}>
            <select
              value={category.name}
              onChange={(event) => updateCategory(index, { name: event.target.value as CategoryName })}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={category.amount}
              onChange={(event) => updateCategory(index, { amount: Number(event.target.value) })}
            />
            <button
              className="icon-button"
              type="button"
              aria-label="Remove category"
              onClick={() => removeCategory(index)}
              disabled={budget.categories.length <= 5}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="subsection-title">
        <h3>Savings goals</h3>
        <button className="small-button" type="button" onClick={addGoal}>
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="stacked-list">
        {budget.savings_goals.map((goal, index) => (
          <div className="mini-card" key={`${goal.name}-${index}`}>
            <input value={goal.name} onChange={(event) => updateGoal(index, { name: event.target.value })} />
            <div className="three-columns">
              <label>
                Target
                <input
                  type="number"
                  min="1"
                  value={goal.target_amount}
                  onChange={(event) => updateGoal(index, { target_amount: Number(event.target.value) })}
                />
              </label>
              <label>
                Current
                <input
                  type="number"
                  min="0"
                  value={goal.current_amount}
                  onChange={(event) => updateGoal(index, { current_amount: Number(event.target.value) })}
                />
              </label>
              <label>
                Months
                <input
                  type="number"
                  min="1"
                  value={goal.months_to_goal}
                  onChange={(event) => updateGoal(index, { months_to_goal: Number(event.target.value) })}
                />
              </label>
            </div>
            <button className="text-button" type="button" onClick={() => removeGoal(index)}>
              Remove goal
            </button>
          </div>
        ))}
      </div>

      <div className="subsection-title">
        <h3>Debt payments</h3>
        <button className="small-button" type="button" onClick={addDebt}>
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="stacked-list">
        {budget.debt_payments.map((debt, index) => (
          <div className="mini-card" key={`${debt.name}-${index}`}>
            <input value={debt.name} onChange={(event) => updateDebt(index, { name: event.target.value })} />
            <div className="three-columns">
              <label>
                Balance
                <input
                  type="number"
                  min="0"
                  value={debt.balance}
                  onChange={(event) => updateDebt(index, { balance: Number(event.target.value) })}
                />
              </label>
              <label>
                Minimum
                <input
                  type="number"
                  min="0"
                  value={debt.minimum_payment}
                  onChange={(event) => updateDebt(index, { minimum_payment: Number(event.target.value) })}
                />
              </label>
              <label>
                APR %
                <input
                  type="number"
                  min="0"
                  value={debt.interest_rate ?? 0}
                  onChange={(event) => updateDebt(index, { interest_rate: Number(event.target.value) })}
                />
              </label>
            </div>
            <button className="text-button" type="button" onClick={() => removeDebt(index)}>
              Remove debt
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
