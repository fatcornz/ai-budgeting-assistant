import { Target } from 'lucide-react';
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
  return (
    <section className="panel progress-panel">
      <div className="section-title-row">
        <Target size={20} />
        <h2>Savings progress</h2>
      </div>

      {budget.savings_goals.length === 0 ? (
        <p className="muted">Add a savings goal to track progress.</p>
      ) : (
        <div className="goal-list">
          {budget.savings_goals.map((goal) => {
            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
            return (
              <article className="goal-card" key={goal.name}>
                <div className="goal-header">
                  <div>
                    <strong>{goal.name}</strong>
                    <p>{currency.format(remaining)} left over {goal.months_to_goal} months</p>
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
      )}
    </section>
  );
}
