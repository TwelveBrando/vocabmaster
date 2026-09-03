import React, { useEffect, useState } from 'react';
import {
  BookOpen, Compass, Copy, LogOut, Menu, Minus, Palette, Sparkles, Square, UserCheck, X,
} from 'lucide-react';
import type { UITheme } from '../types';
import { FlowButton } from './ui/flow-button';
import { RandomLetterSwap } from './ui/random-letter-swap';

interface HeaderProps {
  currentView: 'test' | 'profile' | 'grammar';
  onNavigate: (view: 'test' | 'profile' | 'grammar') => void;
  onOpenSettings: () => void;
  cachedCount: number;
  vocabCount: number;
  currentTheme: UITheme;
  isScrolled: boolean;
  cloudUser: { email: string } | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

const items = [
  { id: 'test', label: 'Тренировка', icon: Compass },
  { id: 'grammar', label: 'Грамматика', icon: Sparkles },
  { id: 'profile', label: 'Словарь', icon: UserCheck },
] as const;

export const Header: React.FC<HeaderProps> = ({
  currentView, onNavigate, onOpenSettings, vocabCount, cloudUser, onOpenAuth, onSignOut, isScrolled, currentTheme,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isElectron = Boolean(window.electronAPI);

  useEffect(() => {
    if (isElectron && window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    }
  }, [isElectron]);

  const navigate = (view: 'test' | 'profile' | 'grammar') => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };
  const appRegion = isElectron ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined;
  const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <header className="app-header relative z-30 w-full select-none px-3 pt-3 sm:px-6 sm:pt-5" style={appRegion}>
      <div className={`mx-auto flex max-w-[1540px] items-center justify-between gap-3 transition-transform duration-300 ${isScrolled ? '-translate-y-2' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('test')}
          className="group flex shrink-0 items-center gap-2.5 text-white"
          style={noDrag}
          aria-label="На главную"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.22)] backdrop-blur-xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
            <BookOpen className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="hidden leading-tight min-[390px]:block">
            <span className="block text-sm font-semibold tracking-[-0.045em]">VocabMaster</span>
            <span className="block pt-0.5 text-[10px] font-medium tracking-[0.14em] text-white/45">TWELVEWISE</span>
          </span>
        </button>

        <nav className="app-nav hidden items-center rounded-[18px] border border-white/[0.08] bg-white/[0.10] p-1.5 shadow-[0_12px_32px_rgb(0,0,0,0.16)] backdrop-blur-2xl md:flex" style={noDrag} aria-label="Основная навигация">
          {items.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                type="button"
                key={id}
                onClick={() => navigate(id)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-[7px] text-xs font-medium tracking-[-0.02em] transition-[color,background-color,box-shadow,transform] duration-300 ${active ? 'bg-white text-black shadow-[0_3px_10px_rgb(0,0,0,0.12)]' : 'text-white/60 hover:text-white'}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span className={`nav-label relative ${active ? 'nav-label--active' : ''}`}>
                  {currentTheme === 'prisma_noir' ? <RandomLetterSwap label={label} staggerDuration={0.065} /> : label}
                </span>
                {id === 'profile' && vocabCount > 0 && <span className={`ml-0.5 text-[10px] tabular-nums ${active ? 'text-black/45' : 'text-white/35'}`}>{vocabCount}</span>}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2" style={noDrag}>
          {cloudUser ? (
            <>
              <span title="Вы вошли в аккаунт" className="hidden max-w-44 truncate px-2 text-xs font-medium text-white/60 lg:block">{cloudUser.email}</span>
              <button type="button" onClick={() => { if (window.confirm('Выйти из аккаунта на этом устройстве?')) onSignOut(); }} title="Выйти из аккаунта" aria-label="Выйти из аккаунта" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.08] text-white/70 transition hover:bg-white hover:text-black">
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </>
          ) : (
            <FlowButton onClick={onOpenAuth} className="hidden rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-white/80 transition hover:bg-white hover:text-black sm:inline-flex" text="Войти" />
          )}
          <button type="button" onClick={onOpenSettings} title="Оформление и генерация" aria-label="Оформление и генерация" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.08] text-white/80 transition hover:bg-white hover:text-black">
            <Palette className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => setIsMobileMenuOpen((open) => !open)} aria-label="Открыть навигацию" aria-expanded={isMobileMenuOpen} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.08] text-white/80 md:hidden">
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          {isElectron && <div className="ml-1 hidden items-center border-l border-white/10 pl-2 sm:flex">
            <button type="button" onClick={() => window.electronAPI?.minimize()} title="Свернуть" className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"><Minus className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => { window.electronAPI?.maximize(); setIsMaximized(!isMaximized); }} title={isMaximized ? 'Восстановить' : 'Развернуть'} className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white">{isMaximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}</button>
            <button type="button" onClick={() => window.electronAPI?.close()} title="Закрыть" className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-rose-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </div>}
        </div>
      </div>

      {isMobileMenuOpen && <div className="mx-auto mt-3 max-w-[1540px] rounded-2xl border border-white/10 bg-[#141414]/90 p-1.5 shadow-2xl backdrop-blur-2xl md:hidden" style={noDrag}>
        {items.map(({ id, label, icon: Icon }) => (
          <button type="button" key={id} onClick={() => navigate(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${currentView === id ? 'bg-white text-black' : 'text-white/70'}`}>
            <Icon className="h-4 w-4" /> {label}
            {id === 'profile' && vocabCount > 0 && <span className="ml-auto text-xs opacity-60">{vocabCount}</span>}
          </button>
        ))}
        {!cloudUser && <button type="button" onClick={onOpenAuth} className="mt-1 flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-medium text-white/70">Войти в аккаунт</button>}
      </div>}
    </header>
  );
};
