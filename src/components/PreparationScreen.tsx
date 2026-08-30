import React from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import type { UITheme } from '../types';
import { THEMES } from '../styles/themes';

interface PreparationScreenProps {
  progress: {
    processed: number;
    total: number;
    message: string;
  };
  errors: string[];
  currentTheme: UITheme;
  onCancel: () => void;
}

export const PreparationScreen: React.FC<PreparationScreenProps> = ({
  progress,
  errors,
  currentTheme,
  onCancel,
}) => {
  const percent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;

  return (
    <div className="max-w-xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center animate-fadeIn relative z-10">
      <div className="relative mb-8">
        <div className={`w-20 h-20 rounded-3xl ${theme.cardBg} ${theme.cardBorder} flex items-center justify-center shadow-2xl ${theme.glowEffect}`}>
          <Loader2 className={`w-10 h-10 ${theme.accentText} animate-spin`} />
        </div>
        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${theme.primaryButton} flex items-center justify-center shadow-lg`}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      <h2 className={`text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight ${theme.textPrimary}`}>
        Подготовка словарного теста
      </h2>
      <p className={`text-sm max-w-md mb-6 ${theme.textSecondary}`}>
        {progress.message || 'ИИ подготавливает переводы, контекстные подсказки и варианты ответов...'}
      </p>

      {/* Progress Bar */}
      <div className={`w-full rounded-full h-3 mb-3 overflow-hidden p-0.5 ${theme.progressTrack}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${theme.progressBar}`}
          style={{ width: `${Math.max(5, percent)}%` }}
        />
      </div>

      <div className={`flex items-center justify-between w-full text-xs mb-8 font-mono ${theme.textMuted}`}>
        <span>Обработано: <strong className={theme.textPrimary}>{progress.processed}</strong> из {progress.total}</span>
        <span className={`font-bold ${theme.textPrimary}`}>{percent}%</span>
      </div>

      {errors.length > 0 && (
        <div className={`w-full mb-6 p-4 rounded-2xl border text-xs text-left flex items-start gap-2.5 backdrop-blur-md ${
          theme.isLight
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-amber-500/10 border-amber-400/30 text-amber-300'
        }`}>
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer backdrop-blur-md ${
          theme.isLight
            ? 'bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs'
            : 'text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
        }`}
      >
        Отменить (Esc)
      </button>
    </div>
  );
};
