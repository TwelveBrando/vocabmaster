import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RotateCcw, 
  AlertTriangle, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronDown,
  FileText,
  ListOrdered
} from 'lucide-react';
import type { QuestionResult, UITheme, CachedWordData } from '../types';
import { THEMES } from '../styles/themes';
import { formatWordsForCopy, formatWordsAsCommaList, formatWordsAsRichMarkdown } from '../utils/copyHelper';

interface ResultScreenProps {
  results: QuestionResult[];
  currentTheme: UITheme;
  sourceType: 'vocab_bank' | 'custom_input';
  originalInputText?: string;
  currentWordsData?: CachedWordData[];
  onRestartAll: () => void;
  onRestartMistakesOnly: () => void;
  onBackToSetup: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  results,
  currentTheme,
  sourceType,
  originalInputText = '',
  currentWordsData = [],
  onRestartAll,
  onRestartMistakesOnly,
  onBackToSetup,
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  const total = results.length;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const incorrectCount = total - correctCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const mistakes = results.filter((r) => !r.isCorrect);

  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;

  useEffect(() => {
    if (accuracy >= 80) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore confetti error
      }
    }
  }, [accuracy]);

  // Close copy dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        onRestartAll();
      } else if (e.key.toLowerCase() === 'r' && mistakes.length > 0) {
        e.preventDefault();
        onRestartMistakesOnly();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBackToSetup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestartAll, onRestartMistakesOnly, onBackToSetup, mistakes.length]);

  const handleCopyToClipboard = async (text: string, label: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(label);
      setIsCopyMenuOpen(false);
      setTimeout(() => {
        setCopyFeedback(null);
      }, 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyFeedback(label);
      setIsCopyMenuOpen(false);
      setTimeout(() => {
        setCopyFeedback(null);
      }, 2500);
    }
  };

  const handleQuickCopy = () => {
    const { text, count } = formatWordsForCopy({
      results,
      sourceType,
      originalInputText,
      currentWordsData,
      mistakesOnly: false,
    });
    handleCopyToClipboard(
      text,
      sourceType === 'vocab_bank'
        ? `Скопировано ${count} слов через запятую!`
        : `Скопировано ${count} слов в исходном формате!`
    );
  };

  const handleCopyMistakes = () => {
    const { text, count } = formatWordsForCopy({
      results,
      sourceType,
      originalInputText,
      currentWordsData,
      mistakesOnly: true,
    });
    handleCopyToClipboard(
      text,
      sourceType === 'vocab_bank'
        ? `Скопировано ${count} ошибок через запятую!`
        : `Скопировано ${count} ошибок в исходном формате!`
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-5 flex flex-col gap-6 h-full flex-1 min-h-0 overflow-y-auto select-none animate-fadeIn relative z-10">
      {/* Top Banner / Score Summary Card */}
      <div className={`${theme.cardBg} ${theme.cardBorder} rounded-2xl p-6 sm:p-7 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 shadow-md relative z-30 backdrop-blur-xl transition-all`}>
        {/* Left: Trophy + Score Info */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
            theme.isLight 
              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
              : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
          }`}>
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <span className={`text-xs uppercase tracking-wider font-extrabold ${theme.accentText}`}>
              Тестирование завершено
            </span>
            
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 leading-tight ${theme.textPrimary}`}>
              Результат: {accuracy}%
            </h2>
            
            <p className={`text-xs sm:text-sm mt-1 leading-normal ${theme.textSecondary}`}>
              Правильно: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{correctCount}</strong> из {total} слов
              {incorrectCount > 0 && (
                <> (ошибок: <strong className="text-rose-600 dark:text-rose-400 font-bold">{incorrectCount}</strong>)</>
              )}
            </p>
          </div>
        </div>

        {/* Right: Clean, Symmetric 2-Row Action Grid */}
        <div className="flex flex-col gap-2 shrink-0 self-stretch xl:self-auto xl:w-[380px] relative z-40">
          {/* Row 1: Main Test Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRestartAll}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 ${theme.primaryButton} ${mistakes.length === 0 ? 'sm:col-span-2' : ''}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Пройти заново</span>
              <span className="opacity-80 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20">Enter</span>
            </button>

            {mistakes.length > 0 && (
              <button
                type="button"
                onClick={onRestartMistakesOnly}
                className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 ${
                  theme.isLight
                    ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                <span>Ошибки</span>
                <span className="opacity-75 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20">R</span>
              </button>
            )}
          </div>

          {/* Row 2: Copy & Navigation Utilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Copy Words Dropdown Button */}
            <div className="relative z-50 w-full" ref={copyMenuRef}>
              <div className="flex items-center w-full">
                <button
                  type="button"
                  onClick={handleQuickCopy}
                  title="Скопировать слова в исходном формате"
                  className={`flex-1 min-w-0 px-2.5 py-2 rounded-l-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 ${
                    copyFeedback
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : theme.isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                      : 'bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 border-white/10'
                  }`}
                >
                  {copyFeedback ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{copyFeedback ? 'Скопировано!' : 'Скопировать'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCopyMenuOpen(!isCopyMenuOpen)}
                  title="Параметры копирования"
                  className={`px-2 py-2 rounded-r-xl border-y border-r text-xs font-extrabold transition-all cursor-pointer shadow-xs active:scale-98 shrink-0 ${
                    copyFeedback
                      ? 'bg-emerald-700 text-white border-emerald-600'
                      : theme.isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                      : 'bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 border-white/10'
                  }`}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCopyMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dropdown Menu */}
              {isCopyMenuOpen && (
                <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-[999] animate-fadeIn backdrop-blur-2xl ${
                  theme.isLight ? 'bg-white border-slate-200 text-slate-900 shadow-2xl shadow-slate-400/40' : 'bg-[#0a0f1d] border-white/20 text-slate-100 shadow-2xl shadow-black'
                }`}>
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/50 dark:border-white/10 mb-1">
                    Формат копирования
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickCopy}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      theme.isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-extrabold">Все слова ({total})</div>
                      <div className="text-[10px] text-slate-400">
                        {sourceType === 'vocab_bank' ? 'Через запятую' : 'В исходном формате теста'}
                      </div>
                    </div>
                  </button>

                  {mistakes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyMistakes}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        theme.isLight ? 'hover:bg-rose-50 text-rose-900' : 'hover:bg-rose-950/40 text-rose-300'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <div className="font-extrabold">Только ошибки ({mistakes.length})</div>
                        <div className="text-[10px] text-rose-400">
                          {sourceType === 'vocab_bank' ? 'Через запятую' : 'В исходном формате теста'}
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const text = formatWordsAsCommaList(results, false);
                      handleCopyToClipboard(text, `Скопировано ${total} слов через запятую!`);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      theme.isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <Copy className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold">Все через запятую</div>
                      <div className="text-[10px] text-slate-400">word, word, word</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const text = formatWordsAsRichMarkdown(results, currentWordsData, false);
                      handleCopyToClipboard(text, `Скопировано ${total} слов с переводами!`);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      theme.isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <ListOrdered className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold">С переводами (Markdown)</div>
                      <div className="text-[10px] text-slate-400">1. **||word||** – перевод</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Back to Menu */}
            <button
              type="button"
              onClick={onBackToSetup}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 ${
                theme.isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-2xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>В меню</span>
              <span className="opacity-60 text-[10px] font-mono px-1 py-0.5 rounded bg-slate-500/10">Esc</span>
            </button>
          </div>
        </div>
      </div>

      {/* Breakdown List Header */}
      <div className="space-y-3 pb-8 relative z-10">
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.textMuted}`}>
            <Sparkles className={`w-4 h-4 ${theme.accentText}`} />
            Разбор каждого слова ({results.length})
          </h3>

          {copyFeedback && (
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 animate-fadeIn">
              {copyFeedback}
            </span>
          )}
        </div>

        {/* Breakdown Items */}
        <div className="space-y-2.5">
          {results.map((res, idx) => (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl ${
                res.isCorrect
                  ? theme.isLight
                    ? 'bg-white border-2 border-slate-200 text-slate-900 shadow-sm'
                    : 'bg-black/35 border-white/10 text-slate-300'
                  : theme.isLight
                  ? 'bg-rose-50/90 border-2 border-rose-300 text-rose-950 shadow-sm'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="mt-0.5 sm:mt-0">
                  {res.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className={`font-bold text-lg ${theme.textPrimary}`}>
                      {res.question.originalWord}
                    </span>
                    <span className={`text-sm ${theme.textSecondary}`}>
                      — {res.question.russianWord}
                    </span>
                  </div>
                  {res.question.disambiguationHint && (
                    <div className={`text-xs sm:text-sm mt-0.5 ${theme.textMuted}`}>
                      💡 {res.question.disambiguationHint}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-sm font-semibold">
                  {res.isCorrect ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      ✓ {res.userAnswer}
                    </span>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="text-rose-600 dark:text-rose-400 line-through">
                        {res.userAnswer || '(пусто)'}
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold text-base">
                        Ответ: {res.question.correctAnswer}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
