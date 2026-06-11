import type { BudgetInput, ChatMessage } from '../types/budget';

const BUDGET_STORAGE_KEY = 'ai-budgeting-assistant:budget:v1';
const CHAT_STORAGE_KEY = 'ai-budgeting-assistant:chat:v1';

export interface SavedChatState {
  history: ChatMessage[];
  actions: string[];
  usedLlm: boolean | null;
}

export function loadSavedBudget(): BudgetInput | null {
  return loadJson<BudgetInput>(BUDGET_STORAGE_KEY);
}

export function saveBudget(budget: BudgetInput) {
  saveJson(BUDGET_STORAGE_KEY, budget);
}

export function clearSavedBudget() {
  localStorage.removeItem(BUDGET_STORAGE_KEY);
}

export function loadSavedChat(): SavedChatState | null {
  return loadJson<SavedChatState>(CHAT_STORAGE_KEY);
}

export function saveChat(state: SavedChatState) {
  saveJson(CHAT_STORAGE_KEY, state);
}

export function clearSavedChat() {
  localStorage.removeItem(CHAT_STORAGE_KEY);
}

function loadJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function saveJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing or full-browser states.
  }
}
