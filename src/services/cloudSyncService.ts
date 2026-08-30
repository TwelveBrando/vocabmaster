import type { QuestionResult, TestMode, UserVocabularyItem } from '../types';

const TOKEN_KEY = 'vocabmaster_web_token';
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
export interface CloudUser { id: string; email: string; createdAt: string; }
export interface TestAttempt { id: string; mode: TestMode; totalQuestions: number; correctAnswers: number; completedAt: number; }
let token = localStorage.getItem(TOKEN_KEY) || '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Ошибка соединения с сервером.');
  return body as T;
}

export const cloudSyncService = {
  isLoggedIn: () => Boolean(token),
  async signIn(email: string, password: string, register = false): Promise<CloudUser> {
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
