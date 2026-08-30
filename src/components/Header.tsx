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
  X
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

  useEffect(() => {
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    }
  }, []);

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
      className="w-full select-none transition-all duration-300 relative z-30 px-3 sm:px-6 pt-3 pb-1"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className={`max-w-[1600px] mx-auto flex items-center justify-between px-3 sm:px-5 py-2 rounded-2xl border backdrop-blur-2xl transition-all duration-300 shadow-lg ${
        theme.isLight 
          ? 'bg-white/80 border-slate-200/80 shadow-slate-200/50' 
          : 'bg-[#080d19]/80 border-white/[0.08] shadow-black/40'
      }`}>
        {/* Left: Brand Identity with Subtle Pulse */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => onNavigate('test')}
          >
            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-105 shrink-0 ${
              theme.isLight ? 'bg-slate-900 shadow-slate-900/20' : 'bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white shadow-cyan-500/25'
            }`}>
              <BookOpen className="w-4.5 h-4.5 transition-transform duration-300 group-hover:rotate-6" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080d19]" />
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
            className={`flex items-center p-1 rounded-xl border transition-all ${
              theme.isLight ? 'bg-slate-100/90 border-slate-200/70' : 'bg-white/[0.04] border-white/[0.07]'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => onNavigate('test')}
              className={`relative px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                currentView === 'test'
                  ? `${theme.primaryButton} shadow-md scale-[1.02]`
                  : theme.isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Compass className={`w-3.5 h-3.5 ${currentView === 'test' ? 'animate-pulse' : ''}`} />
              <span>Тестирование</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('grammar')}
              className={`relative px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                currentView === 'grammar'
                  ? `${theme.primaryButton} shadow-md scale-[1.02]`
                  : theme.isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Грамматика A1</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className={`relative px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                currentView === 'profile'
                  ? `${theme.primaryButton} shadow-md scale-[1.02]`
                  : theme.isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Словарь</span>
              
              {vocabCount > 0 && (
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full transition-colors ${
                  currentView === 'profile'
                    ? 'bg-black/25 text-white'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {vocabCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right: Status Badges, Settings & Clean Controls */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* Quick Engine / Cache Indicator */}
          <div className="hidden lg:flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium backdrop-blur-md ${
              theme.isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>150k+ слов</span>
            </div>

            {cachedCount > 0 && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium backdrop-blur-md ${
                theme.isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-amber-950/30 border-amber-500/20 text-amber-300'
              }`}>
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Кэш: <strong className="font-bold">{cachedCount}</strong></span>
              </div>
            )}
          </div>

          <button type="button" onClick={cloudUser ? onSignOut : onOpenAuth} title={cloudUser ? 'Выйти из аккаунта' : 'Войти или зарегистрироваться'} className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${theme.navPillBg || 'bg-white/5 border-white/10'}`}>
            {cloudUser ? `☁ ${cloudUser.email}` : '☁ Войти'}
          </button>

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
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
            <span className="hidden sm:inline">Оформление & ИИ</span>
          </button>

          {/* Modern Stylized Window Controls Bar */}
          <div className={`flex items-center gap-1 ml-1 pl-2 border-l ${
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
          </div>
        </div>
      </div>
    </header>
  );
};
