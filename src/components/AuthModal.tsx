import { useState } from 'react';
import type { UITheme } from '../types';
import { cloudSyncService, type CloudUser } from '../services/cloudSyncService';
import { THEMES } from '../styles/themes';

export function AuthModal({ isOpen, onClose, onAuthenticated, theme: themeName }: { isOpen: boolean; onClose: () => void; onAuthenticated: (user: CloudUser) => Promise<void> | void; theme: UITheme }) {
  const [register, setRegister] = useState(false); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const theme = THEMES[themeName] || THEMES.cyber_oasis;
  if (!isOpen) return null;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(''); try { const user = await cloudSyncService.signIn(email, password, register); await onAuthenticated(user); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка авторизации.'); } finally { setLoading(false); } };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form onSubmit={submit} className={`${theme.cardBg} ${theme.cardBorder} w-full max-w-md rounded-2xl border p-6 shadow-2xl flex flex-col gap-4`}>
    <h2 className={`text-xl font-black ${theme.textPrimary}`}>{register ? 'Создать аккаунт' : 'Войти'}</h2><p className={theme.textSecondary}>Аккаунт сохраняет ваш словарь и историю тестов.</p>
    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={`rounded-xl border p-3 ${theme.inputBg} ${theme.inputText}`} />
    <input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль (от 8 символов)" className={`rounded-xl border p-3 ${theme.inputBg} ${theme.inputText}`} />
    {error && <p className="text-sm text-rose-500">{error}</p>}<button disabled={loading} className={`rounded-xl p-3 font-bold ${theme.primaryButton}`}>{loading ? 'Подождите…' : register ? 'Зарегистрироваться' : 'Войти'}</button>
    <button type="button" onClick={() => setRegister(!register)} className={theme.accentText}>{register ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}</button><button type="button" onClick={onClose} className={theme.textMuted}>Отмена</button>
  </form></div>;
}
