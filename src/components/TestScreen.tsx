import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, CheckCircle2, XCircle, CornerDownLeft, Sparkles, Volume2, VolumeX, Loader2, ArrowRight } from 'lucide-react';
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
  isLoadingQuestions?: boolean;
  loadingProgress?: { processed: number; total: number };
}

export const TestScreen: React.FC<TestScreenProps> = ({
  questions,
  settings,
  currentTheme,
  onFinishTest,
  onExit,
  isLoadingQuestions = false,
  loadingProgress,
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
  const [waitingForQuestions, setWaitingForQuestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;
  const currentQuestion = questions[currentIndex];
  const total = questions.length;
  const isLast = currentIndex === total - 1;

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

    if (isLast && isLoadingQuestions) {
      setWaitingForQuestions(true);
    } else if (isLast) {
      onFinishTest(resultsRef.current);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setUserInput('');
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setIsCurrentCorrect(false);
      setTimeout(keepFocus, 20);
    }
  }, [isLast, isLoadingQuestions, onFinishTest, keepFocus]);

  useEffect(() => {
    if (!waitingForQuestions) return;
    if (currentIndex < questions.length - 1) {
      setWaitingForQuestions(false);
      setCurrentIndex(previous => previous + 1);
      setUserInput('');
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setIsCurrentCorrect(false);
      setTimeout(keepFocus, 20);
    } else if (!isLoadingQuestions) {
      setWaitingForQuestions(false);
      onFinishTest(resultsRef.current);
    }
  }, [waitingForQuestions, currentIndex, questions.length, isLoadingQuestions, keepFocus, onFinishTest]);

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
      className="test-screen relative z-10 mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col justify-between overflow-y-auto px-3 py-3 select-none animate-fadeIn sm:px-10 sm:py-6"
    >
      {/* Top Header Bar inside Test */}
      <div>
        <div className="flex items-center justify-between gap-2 text-sm mb-3 font-medium">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className={`px-2.5 py-0.5 rounded-md border font-bold text-xs ${theme.accentBadge}`}>
              {currentIndex + 1} из {total}
            </span>
            <span className={`hidden sm:inline font-semibold text-xs ${theme.textSecondary}`}>
              {currentQuestion.mode === 'mode1_choice' && 'Формат 1: Выбор варианта (клавиши 1–7)'}
              {currentQuestion.mode === 'mode2_ru_to_en' && 'Формат 2: Русский → English (с описанием)'}
              {currentQuestion.mode === 'mode3_en_to_ru' && 'Формат 3: English → Русский (синонимы)'}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isLoadingQuestions && loadingProgress && (
              <div className={`flex min-w-24 sm:min-w-40 flex-col gap-1 rounded-lg border px-2 sm:px-3 py-1.5 ${theme.kbdBg}`}>
                <div className="flex items-center justify-between gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5"><Loader2 className={`h-3 w-3 animate-spin ${theme.accentText}`} /><span className="hidden sm:inline">Загрузка слов</span></span>
                  <span>{loadingProgress.processed}/{loadingProgress.total}</span>
                </div>
                <div className={`h-1 overflow-hidden rounded-full ${theme.progressTrack}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${theme.progressFill}`}
                    style={{ width: `${loadingProgress.total ? Math.round((loadingProgress.processed / loadingProgress.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSoundActive(!soundActive);
              }}
              className={`grid h-10 w-10 place-items-center rounded-md transition-all cursor-pointer sm:h-auto sm:w-auto sm:p-1.5 ${
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
              className={`min-h-10 px-3 sm:px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer backdrop-blur-md active:scale-98 shadow-xs ${
                theme.isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-900 shadow-2xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              <span className="hidden sm:inline">Esc • </span>Выйти
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
      <div className="my-auto flex w-full max-w-3xl flex-col items-center py-4 text-center sm:py-6">
        {/* Disambiguation Context Hint for Mode 2 */}
        {currentQuestion.mode === 'mode2_ru_to_en' && mode2ContextBadge && (
          <div className={`mb-4 px-4 py-3 sm:mb-5 sm:px-5 rounded-2xl ${theme.cardBg} ${theme.cardBorder} text-sm sm:text-base shadow-xl flex items-center gap-2.5 max-w-2xl animate-fadeIn`}>
            <Sparkles className={`w-5 h-5 ${theme.accentText} shrink-0`} />
            <span className={`font-medium text-left ${theme.textSecondary}`}>
              Контекст: <strong className={`font-bold ${theme.textPrimary}`}>{mode2ContextBadge}</strong>
            </span>
          </div>
        )}

        {/* Main Prompt Word Display */}
        <div className="relative mb-5 sm:mb-8">
          <h1 className={`break-words text-3xl min-[380px]:text-4xl sm:text-6xl font-extrabold tracking-tight drop-shadow-xs ${theme.textPrimary}`}>
            {currentQuestion.mode === 'mode2_ru_to_en'
              ? mode2RussianMain
              : currentQuestion.originalWord}
          </h1>
        </div>

        {/* Mode 1: Multiple Choice Options */}
        {currentQuestion.mode === 'mode1_choice' && currentQuestion.options && (
          <div className="mt-2 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5">
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
                  className={`min-h-14 p-3.5 sm:p-5 rounded-2xl transition-all flex items-center justify-between gap-3 cursor-pointer text-left ${buttonStyle}`}
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
                enterKeyHint="done"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={userInput}
                disabled={isAnswered}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={
                  currentQuestion.mode === 'mode2_ru_to_en'
                    ? 'Введите слово на английском...'
                    : 'Введите перевод на русском...'
                }
                className={`w-full px-4 py-4 sm:px-6 sm:py-5 rounded-2xl text-lg min-[380px]:text-xl sm:text-2xl text-center font-bold focus:outline-none transition-all leading-relaxed ${
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
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border backdrop-blur-md ${theme.kbdBg}`}>
                  <CornerDownLeft className={`w-3.5 h-3.5 ${theme.accentText}`} />
                  <span>Enter</span>
                </div>
              )}
            </div>
            {!isAnswered && (
              <button
                type="button"
                disabled={!userInput.trim()}
                onClick={(event) => {
                  event.stopPropagation();
                  handleAnswerSubmit(userInput);
                }}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40 sm:hidden ${theme.primaryButton}`}
              >
                Проверить ответ
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
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
                <div className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
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
                  <div className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
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

        {isAnswered && !waitingForQuestions && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              advanceToNext();
            }}
            className={`mt-3 flex min-h-12 w-full max-w-xl items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-lg transition sm:hidden ${theme.primaryButton}`}
          >
            {isLast && !isLoadingQuestions ? 'Завершить тест' : 'Следующее слово'}
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}

        {waitingForQuestions && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold ${theme.kbdBg}`}>
            <Loader2 className={`h-4 w-4 animate-spin ${theme.accentText}`} />
            Готовим следующие слова…
          </div>
        )}
      </div>

      {/* Bottom Keyboard Controls Hint Bar */}
      <div className={`hidden border-t pt-4.5 sm:flex flex-wrap items-center justify-center gap-5 text-xs sm:text-sm ${
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
