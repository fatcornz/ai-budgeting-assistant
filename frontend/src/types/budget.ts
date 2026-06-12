export const CATEGORY_OPTIONS = [
  'housing',
  'food',
  'transportation',
  'utilities',
  'insurance',
  'healthcare',
  'debt',
  'services',
  'subscriptions',
  'shopping',
  'entertainment',
  'education',
  'travel',
  'childcare',
  'personal care',
  'gifts',
  'pets',
  'other'
] as const;

export type CategoryName = (typeof CATEGORY_OPTIONS)[number];

export const STARTER_CATEGORIES: CategoryName[] = ['housing', 'food', 'transportation'];

export const CATEGORY_LABELS: Record<CategoryName, string> = {
  housing: 'Housing',
  food: 'Food & Drinks',
  transportation: 'Transportation',
  utilities: 'Utilities',
  insurance: 'Insurance',
  healthcare: 'Healthcare',
  debt: 'Debt',
  services: 'Services',
  subscriptions: 'Subscriptions',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  education: 'Education',
  travel: 'Travel',
  childcare: 'Childcare',
  'personal care': 'Personal care',
  gifts: 'Gifts',
  pets: 'Pets',
  other: 'Other'
};

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

export interface AuthResponse {
  token: string;
  username: string;
}

export interface BudgetProfile {
  id: number;
  name: string;
  budget: BudgetInput;
  created_at: string;
  updated_at: string;
}

export interface BudgetHistoryEntry {
  id: number;
  profile_id: number;
  month: string;
  budget: BudgetInput;
  analysis: BudgetAnalysis;
  created_at: string;
}

export interface CsvCategorizeResponse {
  categories: BudgetCategory[];
  imported_rows: number;
  skipped_rows: number;
}

export interface LessonSnippet {
  title: string;
  topic: string;
  content: string;
}

export interface LessonSearchResponse {
  snippets: LessonSnippet[];
}

export interface ChatEvaluationResult {
  prompt: string;
  passed: boolean;
  notes: string;
}

export interface ChatEvaluationResponse {
  passed: number;
  failed: number;
  results: ChatEvaluationResult[];
}
