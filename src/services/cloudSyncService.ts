import type { QuestionResult, TestMode, UserVocabularyItem } from '../types';

const TOKEN_KEY = 'vocabmaster_web_token';
// Production injects VITE_API_URL at build time. During local Vite development
// we use the same-origin proxy below, so the browser never tries localhost:3001.
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 25_000;
const WARMUP_TIMEOUT_MS = 30_000;
let warmupPromise: Promise<void> | null = null;
export interface CloudUser { id: string; email: string; createdAt: string; }
export interface TestAttempt { id: string; mode: TestMode; totalQuestions: number; correctAnswers: number; completedAt: number; }
let token = localStorage.getItem(TOKEN_KEY) || '';

function warmUpApi(): Promise<void> {
  if (warmupPromise) return warmupPromise;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);
  warmupPromise = fetch(`${API_URL}/health`, { signal: controller.signal })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => window.clearTimeout(timeoutId));
  return warmupPromise;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Ошибка соединения с сервером.');
    return body as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Сервер запускается дольше обычного. Проверьте подключение и повторите попытку.');
    }
    if (error instanceof TypeError) {
      throw new Error('Не удалось подключиться к серверу. Перезапустите локальный сайт и повторите попытку.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const cloudSyncService = {
  isLoggedIn: () => Boolean(token),
  warmUp: () => { void warmUpApi(); },
  async signIn(email: string, password: string, register = false): Promise<CloudUser> {
    await warmUpApi();
    const data = await request<{ token: string; user: CloudUser }>(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify({ email, password }) });
    token = data.token; localStorage.setItem(TOKEN_KEY, token); return data.user;
  },
  async currentUser(): Promise<CloudUser | null> {
    if (!token) return null;
    try { return (await request<{ user: CloudUser }>('/auth/me')).user; } catch { this.signOut(); return null; }
  },
  signOut() { token = ''; localStorage.removeItem(TOKEN_KEY); },
  loadVocabulary: async () => (await request<{ items: UserVocabularyItem[] }>('/vocabulary')).items,
  saveVocabulary: async (items: UserVocabularyItem[]) => request<void>('/vocabulary', { method: 'PUT', body: JSON.stringify({ items }) }),
  saveHistory: async (mode: TestMode, results: QuestionResult[]) => request('/test-history', { method: 'POST', body: JSON.stringify({ mode, results: results.map(r => ({ word: r.question.originalWord, userAnswer: r.userAnswer, isCorrect: r.isCorrect, timeTakenMs: r.timeTakenMs })) }) }),
  loadHistory: async () => (await request<{ attempts: TestAttempt[] }>('/test-history')).attempts,
};
