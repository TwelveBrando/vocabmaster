import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Palette, 
  Compass, 
  UserCheck, 
  Minus, 
  Square, 
  Copy, 
  X,
  LogOut
} from 'lucide-react';
import type { UITheme } from '../types';
import { THEMES } from '../styles/themes';

interface HeaderProps {
  currentView: 'test' | 'profile' | 'grammar';
  onNavigate: (view: 'test' | 'profile' | 'grammar') => void;
  onOpenSettings: () => void;
  cachedCount: number;
  vocabCount: number;
  currentTheme: UITheme;
  cloudUser: { email: string } | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenSettings,
  cachedCount,
  vocabCount,
  currentTheme,
  cloudUser,
  onOpenAuth,
  onSignOut,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;
  const isElectron = Boolean(window.electronAPI);

  useEffect(() => {
    if (isElectron && window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    }
  }, [isElectron]);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.minimize();
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.maximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.close();
  };

  return (
    <header
      className="relative z-30 w-full select-none px-2 pb-1 pt-2 transition-all duration-300 sm:px-6 sm:pt-3"
      style={isElectron ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
    >
      <div className={`mx-auto flex max-w-[1600px] flex-col gap-2 rounded-2xl border px-2.5 py-2 shadow-lg backdrop-blur-2xl transition-all duration-300 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
        theme.isLight 
          ? 'bg-white/80 border-slate-200/80 shadow-slate-200/50' 
          : 'bg-black/45 border-white/15 shadow-black/40'
      }`}>
        {/* Left: Brand Identity with Subtle Pulse */}
        <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => onNavigate('test')}
          >
            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-105 shrink-0 ${
              theme.isLight ? 'bg-slate-900 shadow-slate-900/20' : 'bg-white text-black shadow-white/10'
            }`}>
              <BookOpen className="w-4.5 h-4.5 transition-transform duration-300 group-hover:rotate-6" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-black" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={`text-base font-black tracking-tight leading-none ${theme.textPrimary}`}>
                  Vocab<span className={theme.accentText}>Master</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block ${
                  theme.isLight ? 'bg-slate-200/80 text-slate-700' : 'bg-white/10 text-slate-300'
                }`}>
                  PRO
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 hidden sm:block">
                AI Vocabulary & Grammar
              </span>
            </div>
          </div>

          {/* Navigation Island (Floating Pill Switcher) */}
          <nav
            className={`flex w-full min-w-0 items-center gap-0.5 overflow-x-auto p-1 rounded-xl border transition-all sm:w-auto ${
              theme.isLight ? 'bg-slate-100/90 border-slate-200/70' : 'bg-white/[0.04] border-white/[0.07]'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => onNavigate('test')}
              className={`relative shrink-0 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                currentView === 'test'
                  ? `${theme.primaryButton} shadow-md scale-[1.02]`
                  : theme.isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  : 'text-white/55 hover:text-white hover:bg-white/10'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${currentView === 'test' ? 'animate-pulse' : ''}`} />
              <span className="hidden min-[420px]:inline">Тестирование</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('grammar')}
              className={`relative shrink-0 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                currentView === 'grammar'
                  ? `${theme.primaryButton} shadow-md scale-[1.02]`
                  : theme.isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  : 'text-white/55 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden min-[420px]:inline">Грамматика A1</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className={`relative shrink-0 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                currentView === 'profile'
                  ? `${theme.primaryButton} shadow-md scale-[1.02]`
                  : theme.isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  : 'text-white/55 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden min-[420px]:inline">Словарь</span>
              
              {vocabCount > 0 && (
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full transition-colors ${
                  currentView === 'profile'
                    ? 'bg-black/25 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                }`}>
                  {vocabCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right: Status Badges, Settings & Clean Controls */}
        <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto sm:justify-end sm:gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Quick Engine / Cache Indicator */}
          <div className="hidden lg:flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium backdrop-blur-md ${
              theme.isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white/5 border-white/15 text-white/80'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>150k+ слов</span>
            </div>

            {cachedCount > 0 && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium backdrop-blur-md ${
                theme.isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-white/5 border-white/15 text-white/80'
            }`}>
              <Sparkles className="w-3 h-3 text-white" />
                <span>Кэш: <strong className="font-bold">{cachedCount}</strong></span>
              </div>
            )}
          </div>

          {cloudUser ? (
            <>
              <div title="Вы вошли в аккаунт" className={`max-w-[11rem] truncate px-2 py-1.5 rounded-xl border text-xs font-bold sm:max-w-[15rem] sm:px-3 ${theme.navPillBg || 'bg-white/5 border-white/10'}`}>
                ☁ {cloudUser.email}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Выйти из аккаунта на этом устройстве?')) onSignOut();
                }}
                title="Выйти из аккаунта"
                aria-label="Выйти из аккаунта"
                className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${theme.navPillBg || 'bg-white/5 border-white/10'} hover:text-rose-500`}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button type="button" onClick={onOpenAuth} title="Войти или зарегистрироваться" className={`px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-bold ${theme.navPillBg || 'bg-white/5 border-white/10'}`}>
              ☁ Войти
            </button>
          )}

          {/* Settings & Theme Trigger */}
          <button
            onClick={onOpenSettings}
            title="Настройки ИИ и Темы оформления"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-2 active:scale-95 shadow-sm hover:shadow-md ${
              theme.navPillBg || 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Palette className={`w-3.5 h-3.5 ${theme.accentText}`} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span className="hidden md:inline">Оформление & ИИ</span>
          </button>

          {/* Modern Stylized Window Controls Bar */}
          {isElectron && <div className={`flex items-center gap-1 ml-1 pl-2 border-l ${
            theme.isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <button
              type="button"
              onClick={handleMinimize}
              title="Свернуть"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                theme.isLight
                  ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-950'
                  : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={handleMaximize}
              title={isMaximized ? 'Восстановить' : 'Развернуть'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                theme.isLight
                  ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-950'
                  : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {isMaximized ? (
                <Copy className="w-3 h-3 stroke-[2.5]" />
              ) : (
                <Square className="w-3 h-3 stroke-[2.5]" />
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              title="Закрыть"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer group hover:bg-rose-500 hover:text-white ${
                theme.isLight
                  ? 'text-slate-600 hover:bg-rose-600 hover:text-white'
                  : 'text-slate-400 hover:bg-rose-600 hover:text-white'
              }`}
            >
              <X className="w-3.5 h-3.5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-150" />
            </button>
          </div>}
        </div>
      </div>
    </header>
  );
};
