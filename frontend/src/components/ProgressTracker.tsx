import { CalendarRange, PiggyBank, Target, TrendingUp } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { BudgetInput } from '../types/budget';

interface ProgressTrackerProps {
  budget: BudgetInput;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export function ProgressTracker({ budget }: ProgressTrackerProps) {
  const totalSaved = budget.savings_goals.reduce((total, goal) => total + goal.current_amount, 0);
  const totalTarget = budget.savings_goals.reduce((total, goal) => total + goal.target_amount, 0);
  const totalRemaining = Math.max(totalTarget - totalSaved, 0);
  const totalProgress = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;
  const maxGoalTarget = Math.max(...budget.savings_goals.map((goal) => goal.target_amount), 1);
  const monthlyTarget = budget.savings_goals.reduce((total, goal) => {
    const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
    return total + remaining / goal.months_to_goal;
  }, 0);
  const annualContribution = budget.savings_goals.reduce((total, goal) => {
    const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
    const monthlyAmount = remaining / goal.months_to_goal;
    return total + Math.min(remaining, monthlyAmount * 12);
  }, 0);
  const annualCheckpoint = Math.min(totalSaved + annualContribution, totalTarget);
  const longestTimeline = Math.max(...budget.savings_goals.map((goal) => goal.months_to_goal), 0);
  const monthlyProjection = buildMonthlyProjection(budget);
  const maxProjection = Math.max(totalTarget, ...monthlyProjection.map((month) => month.amount), 1);

  return (
    <section className="panel progress-panel section-anchor" id="tracker">
      <div className="section-title-row">
        <Target size={20} />
        <h2>Savings progress</h2>
      </div>

      {budget.savings_goals.length === 0 ? (
        <p className="muted">Add a savings goal to track progress.</p>
      ) : (
        <>
          <div className="savings-analytics">
            <article className="savings-total-card">
              <div>
                <span className="eyebrow"><PiggyBank size={15} /> Saved so far</span>
                <strong>{currency.format(totalSaved)}</strong>
                <p>{Math.round(totalProgress)}% of {currency.format(totalTarget)} saved</p>
              </div>
              <div className="savings-ring" style={{ '--progress': `${totalProgress}%` } as CSSProperties}>
                <span>{Math.round(totalProgress)}%</span>
              </div>
            </article>

            <div className="savings-stats">
              <div>
                <span>Total goal</span>
                <strong>{currency.format(totalTarget)}</strong>
              </div>
              <div>
                <span>Still needed</span>
                <strong>{currency.format(totalRemaining)}</strong>
              </div>
              <div>
                <span>Monthly target</span>
                <strong>{currency.format(monthlyTarget)}</strong>
              </div>
              <div>
                <span>Timeline</span>
                <strong>{formatTimeline(longestTimeline)}</strong>
              </div>
            </div>

            <div className="savings-graph" aria-label="Savings saved by goal">
              {budget.savings_goals.map((goal) => {
                const savedHeight = Math.max((goal.current_amount / maxGoalTarget) * 100, 4);
                const targetHeight = Math.max((goal.target_amount / maxGoalTarget) * 100, 8);
                return (
                  <div className="savings-column" key={goal.name}>
                    <div className="savings-bars">
                      <span className="target-bar" style={{ height: `${targetHeight}%` }} />
                      <span className="saved-bar" style={{ height: `${savedHeight}%` }} />
                    </div>
                    <span>{goal.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="monthly-tracker">
            <div className="section-header compact">
              <div className="section-title-row">
                <CalendarRange size={19} />
                <h3>Month-by-month tracker</h3>
              </div>
              <div className="annual-marker">
                <TrendingUp size={16} />
                <span>12-month checkpoint {currency.format(annualCheckpoint)}</span>
              </div>
            </div>
            <div className="month-bars" aria-label="Projected savings progress by month">
              {monthlyProjection.map((month) => (
                <div className="month-column" key={month.label}>
                  <div className="month-bar-shell">
                    <span
                      className="month-bar-fill"
                      style={{ height: `${Math.max((month.amount / maxProjection) * 100, 5)}%` }}
                    />
                  </div>
                  <strong>{month.label}</strong>
                  <span>{currency.format(month.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="goal-list">
            {budget.savings_goals.map((goal) => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
              return (
                <article className="goal-card" key={goal.name}>
                  <div className="goal-header">
                    <div>
                      <strong>{goal.name}</strong>
                      <p>{currency.format(remaining)} left over {formatTimeline(goal.months_to_goal)}</p>
                    </div>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="muted">
                    Monthly target: {currency.format(remaining / goal.months_to_goal)}
                  </p>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function buildMonthlyProjection(budget: BudgetInput) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const start = new Date();

  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    const projected = budget.savings_goals.reduce((total, goal) => {
      const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
      const monthlyAmount = remaining / goal.months_to_goal;
      return total + goal.current_amount + Math.min(remaining, monthlyAmount * monthNumber);
    }, 0);

    return {
      label: formatter.format(new Date(start.getFullYear(), start.getMonth() + index, 1)),
      amount: Math.round(projected)
    };
  });
}

function formatTimeline(months: number) {
  if (months <= 0) return 'Ongoing';
  if (months < 12) return `${months} mo`;
  if (months === 12) return 'Annual';
  const years = months / 12;
  return Number.isInteger(years) ? `${years} yr` : `${months} mo`;
}
