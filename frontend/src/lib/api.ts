import type {
  AuthResponse,
  BudgetAnalysis,
  BudgetHistoryEntry,
  BudgetInput,
  BudgetProfile,
  ChatEvaluationResponse,
  ChatMessage,
  ChatResponse,
  CsvCategorizeResponse,
  LessonSearchResponse
} from '../types/budget';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? `${window.location.protocol}//${window.location.hostname}:8000`;
const MAX_STATEMENT_FILE_SIZE_BYTES = 6_000_000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {})
      },
      ...options
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not reach the backend at ${API_BASE_URL}. Make sure the backend is running.`);
    }
    throw error;
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  const details = await response.text();
  if (!details) return '';

  try {
    const parsed = JSON.parse(details) as {
      detail?: string | Array<{ msg?: string; loc?: string[] }>;
    };
    if (typeof parsed.detail === 'string') return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((item) => {
          const field = item.loc ? item.loc[item.loc.length - 1] : undefined;
          return field && item.msg ? `${formatFieldName(field)}: ${item.msg}` : item.msg;
        })
        .filter(Boolean)
        .join(' ');
    }
  } catch {
    return details;
  }

  return details;
}

function formatFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/^\w/, (letter: string) => letter.toUpperCase());
}

async function authorizedRequest<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {})
    }
  });
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

export function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function fetchProfiles(token: string): Promise<BudgetProfile[]> {
  return authorizedRequest<BudgetProfile[]>('/api/profiles', token);
}

export function createProfile(token: string, name: string, budget: BudgetInput): Promise<BudgetProfile> {
  return authorizedRequest<BudgetProfile>('/api/profiles', token, {
    method: 'POST',
    body: JSON.stringify({ name, budget })
  });
}

export function updateProfile(token: string, id: number, name: string, budget: BudgetInput): Promise<BudgetProfile> {
  return authorizedRequest<BudgetProfile>(`/api/profiles/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify({ name, budget })
  });
}

export function fetchHistory(token: string, profileId: number): Promise<BudgetHistoryEntry[]> {
  return authorizedRequest<BudgetHistoryEntry[]>(`/api/profiles/${profileId}/history`, token);
}

export function createHistory(
  token: string,
  profileId: number,
  month: string,
  budget: BudgetInput
): Promise<BudgetHistoryEntry> {
  return authorizedRequest<BudgetHistoryEntry>('/api/history', token, {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId, month, budget })
  });
}

export function categorizeCsv(csvText: string): Promise<CsvCategorizeResponse> {
  return request<CsvCategorizeResponse>('/api/csv/categorize', {
    method: 'POST',
    body: JSON.stringify({ csv_text: csvText })
  });
}

export async function categorizeStatement(file: File): Promise<CsvCategorizeResponse> {
  if (file.size > MAX_STATEMENT_FILE_SIZE_BYTES) {
    throw new Error('Statement files must be under 6 MB. Export a smaller statement range or use CSV/OFX.');
  }

  const fileData = await readFileAsBase64(file);
  return request<CsvCategorizeResponse>('/api/statements/categorize', {
    method: 'POST',
    body: JSON.stringify({
      file_name: file.name,
      content_type: file.type,
      file_data: fileData
    })
  });
}

export function fetchLessons(query: string): Promise<LessonSearchResponse> {
  return request<LessonSearchResponse>(`/api/lessons?q=${encodeURIComponent(query)}`);
}

export function evaluateChatbot(budget: BudgetInput): Promise<ChatEvaluationResponse> {
  return request<ChatEvaluationResponse>('/api/evaluations/chatbot', {
    method: 'POST',
    body: JSON.stringify(budget)
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('File could not be read.'));
    reader.readAsDataURL(file);
  });
}
