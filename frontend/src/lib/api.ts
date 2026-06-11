import type { BudgetAnalysis, BudgetInput, ChatMessage, ChatResponse } from '../types/budget';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchSampleBudget(): Promise<BudgetInput> {
  return request<BudgetInput>('/api/sample-budget');
}

export function analyzeBudget(budget: BudgetInput): Promise<BudgetAnalysis> {
  return request<BudgetAnalysis>('/api/analyze', {
    method: 'POST',
    body: JSON.stringify(budget)
  });
}

export function sendChatMessage(
  message: string,
  budget: BudgetInput,
  history: ChatMessage[]
): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, budget, history })
  });
}
