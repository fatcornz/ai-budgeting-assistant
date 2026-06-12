import { AlertTriangle, CheckCircle2, Lightbulb, TrendingUp } from 'lucide-react';
import type { BudgetAnalysis } from '../types/budget';
import { MetricCard } from './MetricCard';

interface DashboardProps {
  analysis: BudgetAnalysis | null;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export function Dashboard({ analysis }: DashboardProps) {
  if (!analysis) {
    return (
      <section className="panel empty-state section-anchor" id="dashboard">
        <TrendingUp size={36} />
        <h2>Enter a budget to view analysis</h2>
        <p>The assistant will analyze income, expenses, savings goals, debt payments, and category-level spending.</p>
      </section>
    );
  }

  const scoreTone = analysis.budget_score >= 80 ? 'good' : analysis.budget_score >= 60 ? 'warn' : 'bad';

  return (
    <section className="dashboard-grid section-anchor" id="dashboard">
      <div className={`score-card ${scoreTone}`}>
        <span className="eyebrow">Budget score</span>
        <strong>{analysis.budget_score}</strong>
        <p>{scoreLabel(analysis.budget_score)}</p>
      </div>

      <MetricCard
        label="Monthly expenses"
        value={currency.format(analysis.total_expenses)}
        detail="Across spending categories"
      />
      <MetricCard
        label="Remaining cash"
        value={currency.format(analysis.remaining_cash)}
        detail="After expenses and savings targets"
      />
      <MetricCard
        label="Savings target"
        value={currency.format(analysis.savings_target_monthly)}
        detail={`${analysis.savings_rate}% of income`}
      />
      <MetricCard
        label="Debt minimums"
        value={currency.format(analysis.total_debt_minimums)}
        detail={`${analysis.debt_to_income_ratio}% of income`}
      />

      <article className="panel wide-card">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">Visualization</span>
            <h2>Spending by category</h2>
          </div>
        </div>
        <div className="bar-chart">
          {analysis.category_insights.map((category) => (
            <div className="bar-row" key={category.name}>
              <div className="bar-label">
                <span>{category.name}</span>
                <strong>{currency.format(category.amount)}</strong>
              </div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${category.status}`}
                  style={{ width: `${Math.min(category.percentage_of_income * 3, 100)}%` }}
                />
              </div>
              <span className={`status-pill ${category.status}`}>{category.status}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel insight-card">
        <div className="section-title-row">
          <Lightbulb size={20} />
          <h2>Recommendations</h2>
        </div>
        <ul className="insight-list">
          {analysis.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className="panel insight-card">
        <div className="section-title-row">
          {analysis.warnings.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
          <h2>{analysis.warnings.length > 0 ? 'Watch items' : 'Looks healthy'}</h2>
        </div>
        {analysis.warnings.length > 0 ? (
          <ul className="insight-list warning-list">
            {analysis.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No major warnings detected from the current budget profile.</p>
        )}
      </article>
    </section>
  );
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Strong plan with room to optimize.';
  if (score >= 70) return 'Solid plan, but a few categories need attention.';
  if (score >= 55) return 'Manageable, but cash flow or debt pressure is visible.';
  return 'Needs adjustment before this budget is sustainable.';
}
