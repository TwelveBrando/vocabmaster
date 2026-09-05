import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  RotateCcw, 
  Trophy, 
  HelpCircle, 
  ChevronRight,
  BookOpen,
  Send,
  ListFilter,
  PenTool,
  AlertCircle,
} from 'lucide-react';
import type { UITheme } from '../../types';
import type { GrammarLecture, GrammarExercise, GrammarExerciseType } from '../../types/grammar';
import { grammarAnswersMatch, grammarService } from '../../services/grammarService';
import { generateLocalGrammarExercises } from '../../services/localGrammarGenerator';
import { THEMES } from '../../styles/themes';

interface GrammarExerciseScreenProps {
  currentTheme: UITheme;
  lecture: GrammarLecture;
  onBackToLecture: () => void;
  onBackToHub: () => void;
}

function isAcceptedFillAnswer(exercise: GrammarExercise, answer: string): boolean {
  return grammarAnswersMatch(answer, exercise.correctAnswer)
    || (exercise.acceptableAnswers || []).some((acceptable) => grammarAnswersMatch(answer, acceptable));
}

export const GrammarExerciseScreen: React.FC<GrammarExerciseScreenProps> = ({
  currentTheme,
  lecture,
  onBackToLecture,
  onBackToHub,
}) => {
  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;

  // Exercise sets state (7 + 7 + 7 = 21)
  const [exerciseSets, setExerciseSets] = useState<{
    multipleChoice: GrammarExercise[];
    fillBlank: GrammarExercise[];
    findMistake: GrammarExercise[];
  }>({ multipleChoice: [], fillBlank: [], findMistake: [] });

  const [activeTab, setActiveTab] = useState<GrammarExerciseType>('multiple_choice');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // User answers state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Score logs for each type
  const [logs, setLogs] = useState<{
    multipleChoice: { id: string; isCorrect: boolean }[];
    fillBlank: { id: string; isCorrect: boolean }[];
    findMistake: { id: string; isCorrect: boolean }[];
  }>({
    multipleChoice: [],
    fillBlank: [],
    findMistake: [],
  });

  const [isCompleted, setIsCompleted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);

  const generationControllerRef = useRef<AbortController | null>(null);
  const generationRunRef = useRef(0);
  const successTimerRef = useRef<number | null>(null);
  const resetQuiz = useCallback(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setTextInput('');
    setIsAnswerSubmitted(false);
    setShowHint(false);
    setIsCompleted(false);
    setLogs({ multipleChoice: [], fillBlank: [], findMistake: [] });
    setActiveTab('multiple_choice');
  }, []);

  const runGeneration = useCallback(async (automatic: boolean) => {
    generationControllerRef.current?.abort();
    const controller = new AbortController();
    generationControllerRef.current = controller;
    const runId = ++generationRunRef.current;
    if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current);

    resetQuiz();
    setExerciseSets({ multipleChoice: [], fillBlank: [], findMistake: [] });
    setModelLabel(null);
    setGenerationError(null);
    setGenerationSuccess(null);
    setIsGenerating(true);

    try {
      // Defer history mutation until the StrictMode setup/cleanup probe has finished.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      if (controller.signal.aborted) return;
      const result = generateLocalGrammarExercises(lecture.id);
      if (generationRunRef.current !== runId || controller.signal.aborted) return;
      setExerciseSets({ multipleChoice: result.multipleChoice, fillBlank: result.fillBlank, findMistake: result.findMistake });
      setModelLabel('Практика');
      setGenerationSuccess(
        automatic
          ? '21 задание готово'
          : result.recycled ? 'Новый набор готов. Часть пройденного материала вернулась для повторения.' : 'Новый набор из 21 задания готов',
      );
      successTimerRef.current = window.setTimeout(() => setGenerationSuccess(null), 4_000);
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
      if (generationRunRef.current === runId) {
        setGenerationError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (generationRunRef.current === runId) setIsGenerating(false);
    }
  }, [lecture, resetQuiz]);

  // Generate once on entry; cancelled mounts must not consume history.
  useEffect(() => {
    void runGeneration(true);
    return () => {
      generationControllerRef.current?.abort();
      if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current);
    };
  }, [runGeneration]);

  // Active exercises list
  const currentList: GrammarExercise[] = 
    activeTab === 'multiple_choice' 
      ? exerciseSets.multipleChoice 
      : activeTab === 'fill_blank' 
      ? exerciseSets.fillBlank 
      : exerciseSets.findMistake;

  const currentExercise = currentList[currentIndex] || currentList[0];
  const isLastInTab = currentIndex === currentList.length - 1;
  const currentAnswerIsCorrect = Boolean(currentExercise && (
    activeTab === 'fill_blank'
      ? isAcceptedFillAnswer(currentExercise, textInput)
      : selectedOption && grammarAnswersMatch(selectedOption, currentExercise.correctAnswer)
  ));

  const moveToTab = (tab: GrammarExerciseType) => {
    setActiveTab(tab);
    setCurrentIndex(0);
    setSelectedOption(null);
    setTextInput('');
    setIsAnswerSubmitted(false);
    setShowHint(false);
  };

  const handleSelectOption = (opt: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(opt);
  };

  const handleSubmit = () => {
    if (isAnswerSubmitted || !currentExercise) return;
    const key = activeTab === 'multiple_choice' ? 'multipleChoice' : activeTab === 'fill_blank' ? 'fillBlank' : 'findMistake';
    if (logs[key].some((entry) => entry.id === currentExercise.id)) return;
    if (activeTab === 'multiple_choice' || activeTab === 'find_mistake') {
      if (!selectedOption) return;
    } else {
      if (!textInput.trim()) return;
    }
    const isCorrect = currentAnswerIsCorrect;

    setIsAnswerSubmitted(true);

    // Record score log
    setLogs((previous) => previous[key].some((entry) => entry.id === currentExercise.id)
      ? previous
      : { ...previous, [key]: [...previous[key], { id: currentExercise.id, isCorrect }] });
  };

  const handleNext = () => {
    if (isLastInTab) {
      if (activeTab === 'multiple_choice') {
        moveToTab('fill_blank');
      } else if (activeTab === 'fill_blank') {
        moveToTab('find_mistake');
      } else {
        const allCompleted = logs.multipleChoice.length === exerciseSets.multipleChoice.length
          && logs.fillBlank.length === exerciseSets.fillBlank.length
          && logs.findMistake.length === exerciseSets.findMistake.length;
        if (!allCompleted) return;

        const choiceScore = logs.multipleChoice.filter(l => l.isCorrect).length;
        const fillScore = logs.fillBlank.filter(l => l.isCorrect).length;
        const findMistakeScore = logs.findMistake.filter(l => l.isCorrect).length;

        grammarService.recordExerciseScore(lecture.subtopicId, choiceScore, fillScore, findMistakeScore, totalQuestionsCount);
        setIsCompleted(true);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setTextInput('');
      setIsAnswerSubmitted(false);
      setShowHint(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setTextInput('');
    setIsAnswerSubmitted(false);
    setShowHint(false);
    setIsCompleted(false);
    setLogs({ multipleChoice: [], fillBlank: [], findMistake: [] });
    setActiveTab('multiple_choice');
  };

  const handleGenerateFresh = () => {
    void runGeneration(false);
  };

  const handleMoreOfThisType = () => {
    const key = activeTab === 'multiple_choice' ? 'multipleChoice' : activeTab === 'fill_blank' ? 'fillBlank' : 'findMistake';
    try {
      const otherIds = Object.entries(exerciseSets).filter(([name]) => name !== key).flatMap(([, list]) => list.map(exercise => exercise.id));
      const next = generateLocalGrammarExercises(lecture.id, Math.random, { onlyType: activeTab, excludeIds: otherIds });
      setExerciseSets(previous => ({ ...previous, [key]: next[key] }));
      setLogs(previous => ({ ...previous, [key]: [] }));
      moveToTab(activeTab);
      setGenerationError(null);
      setGenerationSuccess('Новое упражнение готово. Счёт этого вида начинается заново.');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : String(error));
    }
  };

  // Score statistics
  const mcCorrect = logs.multipleChoice.filter(l => l.isCorrect).length;
  const fillCorrect = logs.fillBlank.filter(l => l.isCorrect).length;
  const misCorrect = logs.findMistake.filter(l => l.isCorrect).length;
  const totalCorrect = mcCorrect + fillCorrect + misCorrect;
  const totalQuestionsCount = 
    exerciseSets.multipleChoice.length + 
    exerciseSets.fillBlank.length + 
    exerciseSets.findMistake.length;
  const finalScorePercent = Math.round((totalCorrect / totalQuestionsCount) * 100) || 0;

  if (isCompleted) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6 h-full flex-1 min-h-0 overflow-y-auto select-none animate-fadeIn relative z-10 justify-center font-sans">
        <div className={`${theme.cardBg} ${theme.cardBorder} rounded-3xl p-7 sm:p-9 flex flex-col items-center text-center gap-5 shadow-2xl backdrop-blur-2xl transition-all relative overflow-hidden border`}>
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${
            finalScorePercent >= 60
              ? theme.isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
              : theme.isLight ? 'bg-slate-100 text-slate-800 border border-slate-300' : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}>
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className={`text-xs uppercase tracking-wider font-extrabold ${theme.accentText}`}>
              Все 3 вида упражнений завершены!
            </span>
            <h2 className={`text-3xl font-black mt-1 ${theme.textPrimary}`}>
              Итоговый результат: {finalScorePercent}%
            </h2>
            <p className={`text-sm mt-1 ${theme.textSecondary}`}>
              Правильно: <strong className="text-emerald-500 font-bold">{totalCorrect}</strong> из {totalQuestionsCount} заданий
            </p>
          </div>

          {/* 3 Type Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full text-xs">
            <div className="p-3 rounded-xl border bg-black/5 dark:bg-white/[0.03] border-current/10 flex flex-col gap-1">
              <span className="font-bold opacity-75">1. Выбор ответа</span>
              <span className="font-black text-sm text-emerald-500">{mcCorrect} / {exerciseSets.multipleChoice.length}</span>
            </div>
            <div className="p-3 rounded-xl border bg-black/5 dark:bg-white/[0.03] border-current/10 flex flex-col gap-1">
              <span className="font-bold opacity-75">2. Ввод формы</span>
              <span className="font-black text-sm text-emerald-500">{fillCorrect} / {exerciseSets.fillBlank.length}</span>
            </div>
            <div className="p-3 rounded-xl border bg-black/5 dark:bg-white/[0.03] border-current/10 flex flex-col gap-1">
              <span className="font-bold opacity-75">3. Поиск ошибки</span>
              <span className="font-black text-sm text-emerald-500">{misCorrect} / {exerciseSets.findMistake.length}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-2">
            <button
              type="button"
              onClick={handleRestart}
              className={`px-5 py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                theme.isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Повторить этот набор</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateFresh}
              className={`px-5 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98 ${theme.primaryButton}`}
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>{isGenerating ? 'Подготовка заданий...' : 'Сгенерировать новые (21 шт)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full pt-3 border-t border-slate-200/50 dark:border-white/10 justify-between">
            <button
              type="button"
              onClick={onBackToLecture}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>К лекции</span>
            </button>

            <button
              type="button"
              onClick={onBackToHub}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Все темы A1</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-5 flex flex-col gap-6 h-full flex-1 min-h-0 overflow-y-auto select-none animate-fadeIn relative z-10 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToLecture}
          className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 ${
            theme.isLight
              ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
              : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border-white/10'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>К лекции</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border bg-purple-500/10 border-purple-500/30 text-purple-400 transition-all"
            title={modelLabel ? `Сгенерировано: ${modelLabel}` : 'Свежие задания создаются автоматически'}
          >
            <BookOpen className="w-3 h-3 text-purple-400" />
            <span>{modelLabel || (isGenerating ? 'Генерируем' : 'Новый набор')}</span>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateFresh}
            title="Подготовить новый набор из 21 задания по этой теме"
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Генерация...' : 'Новый набор · 21'}</span>
          </button>
        </div>
      </div>

      {/* Generation Status Banners */}
      {generationError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div>Ошибка генерации: {generationError}</div>
            <div className="font-normal opacity-85 mt-0.5">
              Не удалось собрать набор. Попробуйте снова или вернитесь к лекции.
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              <button type="button" onClick={handleGenerateFresh} className="underline font-black cursor-pointer">
                Попробовать снова
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGenerationError(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {generationSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-300 flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{generationSuccess}</span>
        </div>
      )}

      {/* 3 Exercise Type Selector Tabs */}
      <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 backdrop-blur-xl ${
        theme.isLight ? 'bg-slate-100/90 border-slate-200/80' : 'bg-white/[0.04] border-white/[0.08]'
      }`}>
        <button
          type="button"
          disabled
          className={`min-w-0 flex-1 py-2.5 px-1 rounded-xl text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-default ${
            activeTab === 'multiple_choice'
              ? `${theme.primaryButton} shadow-sm`
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>1. Тест (7)</span>
        </button>

        <button
          type="button"
          disabled
          className={`min-w-0 flex-1 py-2.5 px-1 rounded-xl text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-default ${
            activeTab === 'fill_blank'
              ? `${theme.primaryButton} shadow-sm`
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>2. Ввод (7)</span>
        </button>

        <button
          type="button"
          disabled
          className={`min-w-0 flex-1 py-2.5 px-1 rounded-xl text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-default ${
            activeTab === 'find_mistake'
              ? `${theme.primaryButton} shadow-sm`
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>3. Ошибка (7)</span>
        </button>
      </div>

      {/* Active Question Card */}
      {currentExercise ? (
        <div className={`${theme.cardBg} ${theme.cardBorder} rounded-3xl p-6 sm:p-8 flex flex-col gap-5 shadow-lg backdrop-blur-2xl transition-all border`}>
          {/* Card Meta & Hint */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md ${
                activeTab === 'multiple_choice' ? 'bg-cyan-500/15 text-cyan-500' : activeTab === 'fill_blank' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-purple-500/15 text-purple-500'
              }`}>
                {activeTab === 'multiple_choice' ? 'Вид 1: Тест' : activeTab === 'fill_blank' ? 'Вид 2: Раскрытие скобок' : 'Вид 3: Исправление ошибки'}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Задание {currentIndex + 1} из {currentList.length}
              </span>
            </div>

            {currentExercise.hint && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHint ? 'Скрыть' : 'Подсказка'}</span>
              </button>
            )}
          </div>

          {showHint && currentExercise.hint && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-medium text-amber-900 dark:text-amber-200 animate-fadeIn">
              💡 <strong>Подсказка:</strong> {currentExercise.hint}
            </div>
          )}

          {/* Question Prompt & Sentence */}
          <div className="flex flex-col gap-1.5">
            {currentExercise.prompt && (
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {currentExercise.prompt}
              </div>
            )}

            <div className={`text-lg sm:text-xl font-black leading-relaxed ${theme.textPrimary}`}>
              {currentExercise.question}
            </div>
          </div>

          {/* Mode 1 & 3: Options List */}
          {(activeTab === 'multiple_choice' || activeTab === 'find_mistake') && currentExercise.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {currentExercise.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = grammarAnswersMatch(option, currentExercise.correctAnswer);

                let optionStyle = `${theme.optionIdle} ${theme.textPrimary}`;

                if (isSelected && !isAnswerSubmitted) {
                  optionStyle = `${theme.optionSelected}`;
                }

                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    optionStyle = `${theme.optionCorrect} ring-2 ring-emerald-500/40 shadow-md font-black`;
                  } else if (isSelected && !isCorrect) {
                    optionStyle = `${theme.optionWrong} ring-2 ring-rose-500/40 shadow-md`;
                  } else {
                    optionStyle = 'opacity-35 border-transparent pointer-events-none';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerSubmitted}
                    onClick={() => handleSelectOption(option)}
                    className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-98 ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-white shrink-0 animate-fadeIn" />
                    )}
                    {isAnswerSubmitted && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-white shrink-0 animate-fadeIn" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mode 2: Fill in the blank Text Input */}
          {activeTab === 'fill_blank' && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="relative">
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  name="grammar-answer"
                  disabled={isAnswerSubmitted}
                  value={textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textInput.trim()) {
                      if (!isAnswerSubmitted) handleSubmit();
                      else handleNext();
                    }
                  }}
                  placeholder="Введите ответ по условию..."
                  className={`w-full px-5 py-4 rounded-2xl text-base font-bold transition-all shadow-inner focus:outline-none ${
                    isAnswerSubmitted
                      ? currentAnswerIsCorrect
                        ? 'bg-emerald-500/15 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-300'
                        : 'bg-rose-500/15 border-2 border-rose-500 text-rose-600 dark:text-rose-300'
                      : `${theme.cardBg} ${theme.cardBorder} ${theme.inputText} ${theme.inputPlaceholder} ${theme.inputFocus}`
                  }`}
                />
              </div>
            </div>
          )}

          {/* Explanation Box (After Answer Submitted) */}
          {isAnswerSubmitted && (
            <div className={`p-5 rounded-2xl border flex flex-col gap-2 animate-fadeIn ${
              currentAnswerIsCorrect
                ? theme.isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : theme.isLight ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                {currentAnswerIsCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-emerald-600 dark:text-emerald-400">Правильно!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-rose-600 dark:text-rose-400">Ошибка! Правильный ответ: {currentExercise.correctAnswer}</span>
                  </>
                )}
              </div>

              <p className="text-xs sm:text-sm leading-relaxed mt-1 font-medium">
                {currentExercise.explanation}
              </p>
            </div>
          )}

          {isAnswerSubmitted && isLastInTab && (
            <div className={`rounded-xl p-3 border ${theme.cardBorder} flex flex-col gap-2`}>
              <p className={`text-sm ${theme.textSecondary}`}>Упражнение завершено. Можно продолжить или пройти ещё семь заданий этого вида с новым счётом.</p>
              <button type="button" onClick={handleMoreOfThisType} className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${theme.primaryButton}`}>Ещё 7 заданий этого вида</button>
            </div>
          )}

          {/* Action Button: Check / Next */}
          <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-slate-200/50 dark:border-white/10">
            {!isAnswerSubmitted ? (
              <button
                type="button"
                disabled={activeTab === 'fill_blank' ? !textInput.trim() : !selectedOption}
                onClick={handleSubmit}
                className={`px-6 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-98 ${
                  (activeTab === 'fill_blank' ? textInput.trim() : selectedOption)
                    ? theme.primaryButton
                    : 'bg-slate-300 dark:bg-white/10 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" />
                  <span>Проверить ответ</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className={`px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer active:scale-98 ${theme.primaryButton}`}
              >
                <span>
                  {isLastInTab 
                    ? activeTab === 'multiple_choice' 
                      ? 'К виду 2 (Ввод формы) →' 
                      : activeTab === 'fill_blank' 
                      ? 'К виду 3 (Поиск ошибки) →' 
                      : 'Завершить практику'
                    : 'Следующее задание'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`${theme.cardBg} ${theme.cardBorder} rounded-3xl p-8 sm:p-12 text-center border shadow-lg flex flex-col items-center gap-4`}>
          {isGenerating ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-purple-400 animate-spin" />
              </div>
              <div>
                <div className={`text-lg font-black ${theme.textPrimary}`}>Создаю 21 новое задание</div>
                <p className={`text-sm mt-1 ${theme.textSecondary}`}>
                  Подбираем задания по теме лекции.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-9 h-9 text-rose-400" />
              <div className={`text-sm font-bold ${theme.textSecondary}`}>
                Не удалось подготовить задания. Попробуйте снова.
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" onClick={handleGenerateFresh} className={`px-5 py-2.5 rounded-xl text-xs font-black ${theme.primaryButton}`}>
                  Повторить генерацию
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
