import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Sparkles, X } from 'lucide-react';
import type { UITheme } from '../types';
import { cloudSyncService, type CloudUser } from '../services/cloudSyncService';
import { THEMES } from '../styles/themes';
import { FlowButton } from './ui/flow-button';

export function AuthModal({ isOpen, onClose, onAuthenticated, theme: themeName }: { isOpen: boolean; onClose: () => void; onAuthenticated: (user: CloudUser) => Promise<void> | void; theme: UITheme }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = THEMES[themeName] || THEMES.language_explorer;
  if (!isOpen) return null;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(''); try { const user = await cloudSyncService.signIn(email, password, register); await onAuthenticated(user); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка авторизации.'); } finally { setLoading(false); } };
  return createPortal(<div className={`auth-layer theme-${themeName} fixed inset-0 z-[110] grid place-items-center p-4 sm:p-7`}>
    <button type="button" aria-label="Закрыть" onClick={onClose} className="auth-backdrop absolute inset-0" />
    <section className="auth-panel relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/15 shadow-2xl md:grid-cols-[1.03fr_0.97fr]">
      <form onSubmit={submit} className={`auth-form relative flex min-h-[570px] flex-col justify-center p-7 sm:p-12 ${theme.modalBg}`}>
        <button type="button" onClick={onClose} className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-current/15 opacity-60 transition hover:opacity-100" aria-label="Закрыть"><X className="h-4 w-4" /></button>
        <div className="mb-8"><span className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${theme.accentBadge}`}><Sparkles className="h-3.5 w-3.5" /> VocabMaster</span><h2 className={`max-w-sm text-4xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-5xl ${theme.textPrimary}`}>{register ? 'Создайте свой словарь.' : 'С возвращением.'}</h2><p className={`mt-4 max-w-sm text-sm leading-relaxed ${theme.textSecondary}`}>{register ? 'Сохраняйте слова и результаты тестов в личном аккаунте.' : 'Войдите, чтобы продолжить учиться и синхронизировать прогресс.'}</p></div>
        <div className="space-y-4"><label className={`block text-xs font-bold ${theme.textSecondary}`}>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={`mt-2 w-full rounded-2xl border p-4 text-sm outline-none transition ${theme.inputBg} ${theme.cardBorder} ${theme.inputText} ${theme.inputPlaceholder} ${theme.inputFocus}`} /></label><label className={`block text-xs font-bold ${theme.textSecondary}`}>Пароль<span className={`relative mt-2 flex rounded-2xl border ${theme.inputBg} ${theme.cardBorder} ${theme.inputFocus}`}><input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 8 символов" className={`w-full rounded-2xl bg-transparent p-4 pr-12 text-sm outline-none ${theme.inputText} ${theme.inputPlaceholder}`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className={`absolute inset-y-0 right-3 grid w-9 place-items-center ${theme.textMuted}`} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label></div>
        {error && <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">{error}</p>}
        <FlowButton type="submit" disabled={loading} className={`mt-6 w-full rounded-2xl px-5 py-4 text-sm transition disabled:cursor-wait disabled:opacity-60 ${theme.primaryButton}`} text={loading ? 'Проверяем…' : register ? 'Создать аккаунт' : 'Войти'} /><p className={`mt-6 text-center text-xs ${theme.textMuted}`}>{register ? 'Уже есть аккаунт?' : 'Впервые в VocabMaster?'} <button type="button" onClick={() => { setRegister((value) => !value); setError(''); }} className={`ml-1 font-bold underline underline-offset-4 ${theme.accentText}`}>{register ? 'Войти' : 'Зарегистрироваться'}</button></p>
      </form>
      <aside className="auth-aside relative hidden overflow-hidden p-10 text-black md:flex md:flex-col md:justify-between"><div className="auth-orb absolute -right-16 -top-20 h-72 w-72 rounded-full" /><span className="relative z-10 text-xs font-bold uppercase tracking-[0.18em]">Your learning, in motion.</span><div className="relative z-10"><p className="max-w-xs text-4xl font-semibold leading-[0.95] tracking-[-0.065em]">Words become yours when you use them.</p><div className="mt-8 grid grid-cols-2 gap-3 text-xs font-medium"><div className="rounded-2xl border border-black/15 bg-black/5 p-4">Тесты по своим словам</div><div className="rounded-2xl border border-black/15 bg-black/5 p-4">Прогресс в одном месте</div></div></div><span className="relative z-10 text-[11px] font-bold uppercase tracking-[0.14em]">VocabMaster · Twelvewise</span></aside>
    </section>
  </div>, document.body);
}
