import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, CheckCircle2, XCircle, CornerDownLeft, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { TestQuestion, QuestionResult, AISettings, UITheme } from '../types';
import { sound } from '../utils/sound';
import { THEMES } from '../styles/themes';
import { normalizeAnswer } from '../services/wordParser';

interface TestScreenProps {
  questions: TestQuestion[];
  settings: AISettings;
  currentTheme: UITheme;
  onFinishTest: (results: QuestionResult[]) => void;
  onExit: () => void;
}

export const TestScreen: React.FC<TestScreenProps> = ({
  questions,
  settings,
  currentTheme,
  onFinishTest,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [, setResults] = useState<QuestionResult[]>([]);
  const resultsRef = useRef<QuestionResult[]>([]);
  const [soundActive, setSoundActive] = useState(settings.soundEnabled);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const inputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;
  const currentQuestion = questions[currentIndex];
  const total = questions.length;
  const isLast = currentIndex === total - 1;

  useEffect(() => {
    resultsRef.current = [];
    setResults([]);
  }, [questions]);

  const keepFocus = useCallback(() => {
    if (currentQuestion.mode !== 'mode1_choice' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentQuestion.mode]);

  useEffect(() => {
    keepFocus();
    setStartTime(Date.now());
  }, [currentIndex, keepFocus]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const advanceToNext = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (isLast) {
      onFinishTest(resultsRef.current);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setUserInput('');
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setIsCurrentCorrect(false);
      setTimeout(keepFocus, 20);
    }
  }, [isLast, onFinishTest, keepFocus]);

  const handleAnswerSubmit = useCallback((answer: string, selectedIdx?: number) => {
    if (isAnswered) {
      advanceToNext();
      return;
    }

    const timeTaken = Date.now() - startTime;
    const normUser = normalizeAnswer(answer);
    let correct = false;

    if (currentQuestion.mode === 'mode1_choice') {
      correct = normalizeAnswer(answer) === normalizeAnswer(currentQuestion.correctAnswer);
    } else {
      correct = currentQuestion.acceptableAnswers.some(
        (ans) => normalizeAnswer(ans) === normUser
      );
    }

    if (selectedIdx !== undefined) {
      setSelectedOptionIndex(selectedIdx);
    }

    setIsAnswered(true);
    setIsCurrentCorrect(correct);

    const newResult: QuestionResult = {
      question: currentQuestion,
      userAnswer: answer,
      isCorrect: correct,
      timeTakenMs: timeTaken,
    };

    const updated = [...resultsRef.current, newResult];
    resultsRef.current = updated;
    setResults(updated);

    if (correct) {
      sound.playCorrect(soundActive);
      if (settings.autoAdvanceCorrect) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          advanceToNext();
        }, settings.autoAdvanceDelayMs || 500);
      }
    } else {
      sound.playIncorrect(soundActive);
    }
  }, [
    isAnswered,
    advanceToNext,
    startTime,
    currentQuestion,
    soundActive,
    settings.autoAdvanceCorrect,
    settings.autoAdvanceDelayMs,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow browser shortcuts (zoom Ctrl +, Ctrl -, Ctrl 0, refresh, etc.) without interference
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }

      if (currentQuestion.mode === 'mode1_choice' && currentQuestion.options) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= currentQuestion.options.length) {
          e.preventDefault();
          if (!isAnswered) {
            handleAnswerSubmit(currentQuestion.options[num - 1], num - 1);
          }
          return;
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isAnswered) {
          advanceToNext();
        } else if (currentQuestion.mode !== 'mode1_choice') {
          handleAnswerSubmit(userInput);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentQuestion,
    isAnswered,
    userInput,
    handleAnswerSubmit,
    advanceToNext,
    onExit,
  ]);

  // Extract display details for Mode 2
  const mode2RussianMain = currentQuestion.russianWord || currentQuestion.disambiguationHint;
  const mode2ContextBadge = currentQuestion.disambiguationHint && currentQuestion.disambiguationHint !== currentQuestion.russianWord
    ? currentQuestion.disambiguationHint
    : null;

  return (
    <div
      onClick={keepFocus}
      className="w-full max-w-5xl mx-auto px-6 sm:px-10 py-6 flex flex-col justify-between h-full flex-1 min-h-0 overflow-y-auto select-none animate-fadeIn relative z-10"
    >
      {/* Top Header Bar inside Test */}
      <div>
        <div className="flex items-center justify-between text-sm mb-3 font-medium">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded-md border font-bold text-xs ${theme.accentBadge}`}>
              {currentIndex + 1} из {total}
            </span>
            <span className={`hidden sm:inline font-semibold text-xs ${theme.textSecondary}`}>
              {currentQuestion.mode === 'mode1_choice' && 'Формат 1: Выбор варианта (клавиши 1–7)'}
              {currentQuestion.mode === 'mode2_ru_to_en' && 'Формат 2: Русский → English (с описанием)'}
              {currentQuestion.mode === 'mode3_en_to_ru' && 'Формат 3: English → Русский (синонимы)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSoundActive(!soundActive);
              }}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                theme.isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title={soundActive ? 'Выключить звук' : 'Включить звук'}
            >
              {soundActive ? <Volume2 className={`w-4 h-4 ${theme.accentText}`} /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExit();
              }}
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer backdrop-blur-md active:scale-98 shadow-xs ${
                theme.isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-900 shadow-2xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              Esc • Выйти
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`w-full rounded-full h-2 overflow-hidden ${theme.progressTrack} border border-black/5 dark:border-white/5`}>
          <div
            className={`h-full transition-all duration-200 ${theme.progressFill}`}
            style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Center Word Card */}
      <div className="my-auto flex flex-col items-center text-center w-full max-w-3xl mx-auto py-4">
        {/* Disambiguation Context Hint for Mode 2 */}
        {currentQuestion.mode === 'mode2_ru_to_en' && mode2ContextBadge && (
          <div className={`mb-5 px-5 py-3 rounded-2xl ${theme.cardBg} ${theme.cardBorder} text-sm sm:text-base shadow-xl flex items-center gap-2.5 max-w-2xl animate-fadeIn`}>
            <Sparkles className={`w-5 h-5 ${theme.accentText} shrink-0`} />
            <span className={`font-medium text-left ${theme.textSecondary}`}>
              Контекст: <strong className={`font-bold ${theme.textPrimary}`}>{mode2ContextBadge}</strong>
            </span>
          </div>
        )}

        {/* Main Prompt Word Display */}
        <div className="relative mb-8">
          <h1 className={`text-4xl sm:text-6xl font-extrabold tracking-tight drop-shadow-xs ${theme.textPrimary}`}>
            {currentQuestion.mode === 'mode2_ru_to_en'
              ? mode2RussianMain
              : currentQuestion.originalWord}
          </h1>
        </div>

        {/* Mode 1: Multiple Choice Options */}
        {currentQuestion.mode === 'mode1_choice' && currentQuestion.options && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
            {currentQuestion.options.map((opt, idx) => {
              const keyNumber = idx + 1;
              const isSelected = selectedOptionIndex === idx;
              const isCorrectAnswer = normalizeAnswer(opt) === normalizeAnswer(currentQuestion.correctAnswer);

              let buttonStyle = theme.optionIdle;

              if (isAnswered) {
                if (isCorrectAnswer) {
                  buttonStyle = theme.isLight
                    ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-950 font-bold shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-emerald-950 border-2 border-emerald-400 text-emerald-100 font-bold shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400/40';
                } else if (isSelected && !isCorrectAnswer) {
                  buttonStyle = theme.isLight
                    ? 'bg-rose-100 border-2 border-rose-500 text-rose-950 font-bold shadow-md ring-2 ring-rose-400/30'
                    : 'bg-rose-950 border-2 border-rose-400 text-rose-100 font-bold shadow-lg shadow-rose-950/50 ring-2 ring-rose-400/40';
                } else {
                  buttonStyle = theme.isLight
                    ? 'bg-slate-100/60 border-slate-200/60 text-slate-400 opacity-40'
                    : 'bg-black/40 border-white/5 text-slate-500 opacity-30';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleAnswerSubmit(opt, idx)}
                  className={`p-4.5 sm:p-5 rounded-2xl transition-all flex items-center justify-between gap-3.5 cursor-pointer ${buttonStyle}`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`w-8 h-8 rounded-xl border text-xs font-bold flex items-center justify-center shrink-0 ${theme.kbdBg}`}>
                      {keyNumber}
                    </span>
                    <span className="text-base sm:text-lg font-semibold">{opt}</span>
                  </div>
                  {isAnswered && isCorrectAnswer && (
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />
                  )}
                  {isAnswered && isSelected && !isCorrectAnswer && (
                    <X className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Mode 2 & Mode 3: Text Input */}
        {currentQuestion.mode !== 'mode1_choice' && (
          <div className="w-full max-w-xl mt-4 flex flex-col items-center gap-3.5">
            <div className="relative w-full">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                disabled={isAnswered}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={
                  currentQuestion.mode === 'mode2_ru_to_en'
                    ? 'Введите слово на английском...'
                    : 'Введите перевод на русском...'
                }
                className={`w-full px-6 py-5 rounded-2xl text-xl sm:text-2xl text-center font-bold focus:outline-none transition-all leading-relaxed ${
                  !isAnswered
                    ? `${theme.inputBg} ${theme.cardBorder} ${theme.inputText} ${theme.inputPlaceholder} ${theme.inputFocus} shadow-inner`
                    : isCurrentCorrect
                    ? theme.isLight
                      ? '!bg-emerald-50 !border-2 !border-emerald-500 !text-emerald-950 font-black ring-4 ring-emerald-400/20 shadow-md !opacity-100'
                      : '!bg-slate-900 !border-2 !border-emerald-400 !text-emerald-300 font-black ring-4 ring-emerald-500/30 shadow-2xl !opacity-100'
                    : theme.isLight
                    ? '!bg-rose-50 !border-2 !border-rose-500 !text-rose-950 font-black ring-4 ring-rose-400/20 shadow-md !opacity-100'
                    : '!bg-slate-900 !border-2 !border-rose-400 !text-rose-300 font-black ring-4 ring-rose-500/30 shadow-2xl !opacity-100'
                }`}
              />
              {!isAnswered && userInput && (
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border backdrop-blur-md ${theme.kbdBg}`}>
                  <CornerDownLeft className={`w-3.5 h-3.5 ${theme.accentText}`} />
                  <span>Enter</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Answer Feedback Banner */}
        {isAnswered && (
          <div className="mt-6 w-full max-w-xl animate-fadeIn">
            {isCurrentCorrect ? (
              <div className={`px-5 py-3.5 rounded-2xl border flex items-center justify-between shadow-md transition-all ${
                theme.isLight
                  ? 'bg-white border-emerald-300 text-slate-900 shadow-emerald-500/5'
                  : 'bg-slate-900/90 border-emerald-500/30 text-slate-100 shadow-black/40 backdrop-blur-xl'
              }`}>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span className="text-base font-black tracking-tight">Верно!</span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  theme.isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-white/10 border-white/10 text-slate-300'
                }`}>
                  <span>Enter</span>
                  <CornerDownLeft className="w-3 h-3 opacity-60" />
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-2xl border flex flex-col gap-2.5 shadow-md transition-all ${
                theme.isLight
                  ? 'bg-white border-rose-300 text-slate-900 shadow-rose-500/5'
                  : 'bg-slate-900/90 border-rose-500/30 text-slate-100 shadow-black/40 backdrop-blur-xl'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 stroke-[2.5]" />
                    <span className="text-base font-black tracking-tight text-rose-600 dark:text-rose-400">Неверно</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    theme.isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-white/10 border-white/10 text-slate-300'
                  }`}>
                    <span>Enter</span>
                    <CornerDownLeft className="w-3 h-3 opacity-60" />
                  </div>
                </div>
                <div className={`pt-2 border-t text-sm flex items-baseline gap-2 ${
                  theme.isLight ? 'border-slate-100 text-slate-600' : 'border-white/10 text-slate-400'
                }`}>
                  <span>Правильный ответ:</span>
                  <strong className="font-black text-base text-emerald-600 dark:text-emerald-400">
                    {currentQuestion.correctAnswer}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Keyboard Controls Hint Bar */}
      <div className={`border-t pt-4.5 flex flex-wrap items-center justify-center gap-5 text-xs sm:text-sm ${
        theme.isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-slate-400'
      }`}>
        {currentQuestion.mode === 'mode1_choice' ? (
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md border font-bold text-xs ${theme.kbdBg}`}>1–{currentQuestion.options?.length || 4}</span>
            <span>выбор варианта</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md border font-bold text-xs ${theme.kbdBg}`}>Enter</span>
            <span>подтвердить ответ</span>
          </div>
        )}
        <span className="opacity-30">•</span>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md border font-bold text-xs ${theme.kbdBg}`}>Enter</span>
          <span>следующее слово</span>
        </div>
        <span className="opacity-30">•</span>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md border font-bold text-xs ${theme.kbdBg}`}>Esc</span>
          <span>выход</span>
        </div>
      </div>
    </div>
  );
};
