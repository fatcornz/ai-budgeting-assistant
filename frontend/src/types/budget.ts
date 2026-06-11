export type CategoryName =
  | 'housing'
  | 'food'
  | 'transportation'
  | 'utilities'
  | 'insurance'
  | 'debt'
  | 'entertainment'
  | 'shopping'
  | 'healthcare'
  | 'subscriptions'
  | 'education'
  | 'other';

export type Status = 'low' | 'healthy' | 'watch' | 'high';

export interface BudgetCategory {
  name: CategoryName;
  amount: number;
}

export interface SavingsGoal {
  name: string;
  target_amount: number;
  current_amount: number;
  months_to_goal: number;
}

export interface DebtPayment {
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate?: number | null;
}

export interface BudgetInput {
  monthly_income: number;
  categories: BudgetCategory[];
  savings_goals: SavingsGoal[];
  debt_payments: DebtPayment[];
}

export interface CategoryInsight {
  name: string;
  amount: number;
  percentage_of_income: number;
  status: Status;
}

export interface BudgetAnalysis {
  total_expenses: number;
  remaining_cash: number;
  savings_target_monthly: number;
  total_debt_minimums: number;
  savings_rate: number;
  debt_to_income_ratio: number;
  budget_score: number;
  category_insights: CategoryInsight[];
  recommendations: string[];
  warnings: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  suggested_actions: string[];
  used_llm: boolean;
}
