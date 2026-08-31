import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Sliders, CheckCircle2, FileText, ArrowRight, RotateCcw, ListOrdered, BookOpen, Layers, Plus } from 'lucide-react';
import type { TestMode, UITheme, CEFRLevel } from '../types';
import { THEMES } from '../styles/themes';
import { parseVocabularyInput } from '../services/wordParser';
import { vocabularyService } from '../services/vocabularyService';
import { CEFR_LEVELS_META } from '../data/cefrDictionary';

import type { SessionState } from '../services/settingsService';

interface SetupScreenProps {
  initialText?: string;
  initialMode?: TestMode;
  initialNumOptions?: number;
  initialSourceType?: 'vocab_bank' | 'custom_input';
  initialBankLevel?: CEFRLevel | 'all';
  initialBankWordCount?: number;
  onStartCustomTest: (inputText: string, mode: TestMode, numOptions: number) => void;
  onStartVocabularyBankTest: (level: CEFRLevel | 'all', count: number, mode: TestMode, numOptions: number) => void;
  onNavigateToProfile: () => void;
  onStateChange?: (state: Partial<SessionState>) => void;
  onOpenSettings: () => void;
  currentTheme: UITheme;
}

const EXAMPLE_RICH_FORMAT = `1. **||prescription||** – рецепт (от врача)
2. **||chore||** – домашнее дело, обязанность
3. **||appearance||** – внешность
4. **||apologize||** – извиняться, просить прощения
5. **||succeed||** – преуспеть, добиться успеха
6. **||look forward to||** – ждать с нетерпением (чего-то)
7. **||niece||** – племянница
8. **||blanket||** – одеяло
9. **||find out||** – выяснить, узнать
10. **||break down||** – сломаться (о машине, приборе); расплакаться
11. **||relieved||** – испытывающий облегчение
12. **||put on||** – надевать (одежду)
13. **||curly||** – кудрявый
14. **||bring up||** – воспитывать (детей); поднимать (тему, вопрос)
15. **||neighbor||** – сосед
16. **||abroad||** – за границей
17. **||teenager||** – подросток
18. **||laundry||** – стирка; бельё для стирки`;

const EXAMPLE_COMMA_WORDS = 'prescription, chore, appearance, apologize, succeed, look forward to, niece, blanket, find out, break down, relieved, put on, curly, bring up';

export const SetupScreen: React.FC<SetupScreenProps> = ({
  initialText = '',
  initialMode = 'mode1_choice',
  initialNumOptions = 4,
  initialSourceType = 'vocab_bank',
  initialBankLevel = 'all',
  initialBankWordCount = 15,
  onStartCustomTest,
  onStartVocabularyBankTest,
  onNavigateToProfile,
  onStateChange,
  currentTheme,
}) => {
  const [sourceType, setSourceType] = useState<'vocab_bank' | 'custom_input'>(initialSourceType);
  const [inputText, setInputText] = useState(initialText || EXAMPLE_RICH_FORMAT);
  const [bankLevel, setBankLevel] = useState<CEFRLevel | 'all'>(initialBankLevel);
  const [bankWordCount, setBankWordCount] = useState<number>(initialBankWordCount);
  const [selectedMode, setSelectedMode] = useState<TestMode>(initialMode);
  const [numOptions, setNumOptions] = useState<number>(initialNumOptions);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;

  const vocabStats = vocabularyService.getVocabularyStats();
  const totalUserWords = vocabStats.totalWords;

  useEffect(() => {
    onStateChange?.({
      inputText,
      mode: selectedMode,
      numOptions,
      sourceType,
      bankLevel,
      bankWordCount,
    });
  }, [inputText, selectedMode, numOptions, sourceType, bankLevel, bankWordCount, onStateChange]);

  const parsed = parseVocabularyInput(inputText);
  const customWordsCount = parsed.isFormattedWithTranslations ? parsed.wordsData.length : parsed.rawWords.length;

  const handleStart = () => {
    onStateChange?.({
      inputText,
      mode: selectedMode,
      numOptions,
      sourceType,
      bankLevel,
      bankWordCount,
    });

    if (sourceType === 'vocab_bank') {
      if (totalUserWords === 0) {
        onNavigateToProfile();
        return;
      }
      onStartVocabularyBankTest(bankLevel, bankWordCount, selectedMode, numOptions);
    } else {
      if (customWordsCount === 0) {
        textareaRef.current?.focus();
        return;
      }
      onStartCustomTest(inputText, selectedMode, numOptions);
    }
  };

  // Safe keyboard navigation (never intercepts browser zoom ctrl +, ctrl -, ctrl 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleStart();
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement !== textareaRef.current) {
        if (e.key === '1') setSelectedMode('mode1_choice');
        if (e.key === '2') setSelectedMode('mode2_ru_to_en');
        if (e.key === '3') setSelectedMode('mode3_en_to_ru');
        if (e.key === 'Enter') {
          e.preventDefault();
          handleStart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sourceType, inputText, bankLevel, bankWordCount, selectedMode, numOptions, totalUserWords, customWordsCount]);

  const availableInSelectedLevel = bankLevel === 'all'
    ? totalUserWords
    : vocabStats.byLevel[bankLevel] || 0;

  return (
    <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-[1550px] flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 animate-fadeIn sm:gap-8 sm:px-10 sm:py-8">
      {/* Top Banner & Source Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-200/50 dark:border-white/[0.08]">
        <div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${theme.textPrimary}`}>
            Настройка тестирования
          </h2>
          <p className={`text-sm sm:text-base mt-1.5 ${theme.textSecondary}`}>
            Выберите источник слов: персональный словарный запас или вставьте свой список.
          </p>
        </div>

        {/* Source Switcher Pill */}
        <div className={`flex w-full max-w-full items-center gap-1 p-1.5 rounded-2xl border self-start md:w-auto md:self-auto shadow-xs ${
          theme.isLight ? 'bg-slate-200/90 border-slate-300' : 'bg-black/40 border-white/10'
        }`}>
          <button
            type="button"
            onClick={() => setSourceType('vocab_bank')}
            className={`min-w-0 flex-1 md:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              sourceType === 'vocab_bank'
                ? `${theme.primaryButton} shadow-sm`
                : theme.isLight
                ? 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-950 shadow-2xs'
                : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="truncate md:hidden">Мой словарь ({totalUserWords})</span>
            <span className="hidden md:inline">Мой словарный запас ({totalUserWords})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceType('custom_input')}
            className={`min-w-0 flex-1 md:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              sourceType === 'custom_input'
                ? `${theme.primaryButton} shadow-sm`
                : theme.isLight
                ? 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-950 shadow-2xs'
                : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="md:hidden">Свой список</span>
            <span className="hidden md:inline">Вставить свой список</span>
          </button>
        </div>
      </div>

      {/* SOURCE OPTION A: VOCABULARY BANK */}
      {sourceType === 'vocab_bank' && (
        <div className={`${theme.cardBg} ${theme.cardBorder} p-7 rounded-3xl shadow-xl flex flex-col gap-6 animate-fadeIn`}>
          {totalUserWords === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3 className={`text-xl font-extrabold ${theme.textPrimary}`}>Словарный запас пуст</h3>
                <p className={`text-sm mt-1 max-w-md ${theme.textSecondary}`}>
                  Перейдите в раздел словаря и добавьте слова уровней A1–C2, или импортируйте готовый список в 1 клик.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToProfile}
                className={`px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 ${theme.primaryButton}`}
              >
                <Plus className="w-4 h-4" />
                <span>Открыть Словарь & Профиль</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.textMuted}`}>
                  <Layers className={`w-4 h-4 ${theme.accentText}`} />
                  Фильтр по уровню CEFR
                </span>
                <span className={`text-sm font-bold ${theme.accentText}`}>
                  Доступно для теста: {availableInSelectedLevel} слов
                </span>
              </div>

              {/* CEFR Level filter pills */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {(['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as (CEFRLevel | 'all')[]).map((lvl) => {
                  const count = lvl === 'all' ? totalUserWords : vocabStats.byLevel[lvl] || 0;
                  const isSelected = bankLevel === lvl;
                  const meta = lvl !== 'all' ? CEFR_LEVELS_META[lvl] : null;

                  return (
                    <button
                      key={lvl}
                      type="button"
                      disabled={count === 0 && lvl !== 'all'}
                      onClick={() => setBankLevel(lvl)}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                        count === 0 && lvl !== 'all'
                          ? 'opacity-35 cursor-not-allowed border-dashed border-slate-300 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02] text-slate-400'
                          : isSelected
                          ? `${theme.primaryButton} shadow-md`
                          : theme.isLight
                          ? 'bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 shadow-xs'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {meta && (
                        <span
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20 dark:ring-white/30 shadow-xs shrink-0"
                          style={{ backgroundColor: meta.colorHex }}
                        />
                      )}
                      <span>{lvl === 'all' ? 'Все уровни' : lvl}</span>
                      <span className={`font-bold ${isSelected ? 'opacity-90' : theme.isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Number of words to test */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
                <div>
                  <div className={`text-base font-bold ${theme.textPrimary}`}>Количество слов в тесте</div>
                  <div className={`text-xs ${theme.textSecondary}`}>Сколько случайных слов отобрать из выбранного уровня</div>
                </div>
                <div className={`flex items-center gap-1.5 p-1.5 rounded-xl border shadow-xs ${
                  theme.isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-black/30 border-white/10'
                }`}>
                  {[5, 10, 15, 25, 50, 0].map((num) => {
                    const isAll = num === 0;
                    const isSelected = isAll ? bankWordCount === availableInSelectedLevel || bankWordCount >= 9999 : bankWordCount === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setBankWordCount(isAll ? 9999 : num)}
                        className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                          isSelected
                            ? `${theme.primaryButton} shadow-xs`
                            : theme.isLight
                            ? 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-950 shadow-2xs'
                            : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {isAll ? 'Все' : num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SOURCE OPTION B: CUSTOM TEXT INPUT */}
      {sourceType === 'custom_input' && (
        <div className="flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.textMuted}`}>
              <FileText className={`w-4 h-4 ${theme.accentText}`} />
              Поле ввода слов
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setInputText(EXAMPLE_RICH_FORMAT)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  theme.isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'bg-white/[0.06] border-white/10 text-slate-200 hover:bg-white/[0.12]'
                }`}
              >
                <ListOrdered className="w-4 h-4 text-white" />
                Пример с переводом
              </button>
              <button
                type="button"
                onClick={() => setInputText(EXAMPLE_COMMA_WORDS)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  theme.isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'bg-white/[0.06] border-white/10 text-slate-200 hover:bg-white/[0.12]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-white" />
                Через запятую
              </button>
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="1. **||prescription||** – рецепт (от врача)&#10;2. **||chore||** – домашнее дело, обязанность..."
              className={`w-full px-5 py-4.5 rounded-2xl ${theme.inputBg} ${theme.cardBorder} ${theme.inputText} ${theme.inputPlaceholder} text-base focus:outline-none ${theme.inputFocus} transition-all leading-relaxed resize-none shadow-inner`}
            />
          </div>
        </div>
      )}

      {/* Mode Selector */}
      <div className="flex flex-col gap-4">
        <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.textMuted}`}>
          <Sliders className={`w-4 h-4 ${theme.accentText}`} />
          Формат тестирования
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode 1 */}
          <button
            type="button"
            onClick={() => setSelectedMode('mode1_choice')}
            className={`p-6 rounded-2xl transition-all relative flex flex-col justify-between gap-4 cursor-pointer group text-left ${
              selectedMode === 'mode1_choice'
                ? `${theme.cardBg} ${theme.cardBorder} ${theme.glowEffect} ring-2 ring-white/50`
                : theme.isLight
                ? 'bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-md text-slate-800 shadow-xs'
                : 'bg-white/[0.03] border border-white/10 hover:border-white/20 text-slate-400'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-lg border ${
                selectedMode === 'mode1_choice'
                  ? theme.accentBadge
                  : theme.isLight
                  ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                  : 'bg-white/[0.06] text-slate-300 border-white/10'
              }`}>
                Формат 1 • Клавиша 1
              </span>
              {selectedMode === 'mode1_choice' && (
                <CheckCircle2 className={`w-5 h-5 ${theme.accentText}`} />
              )}
            </div>
            <div>
              <h3 className={`text-lg font-black mb-1.5 ${theme.textPrimary}`}>Выбор из вариантов</h3>
              <p className={`text-sm leading-relaxed ${theme.textSecondary}`}>
                Выбор перевода из предложенных вариантов ответа. Мгновенный выбор клавишами 1–7.
              </p>
            </div>
          </button>

          {/* Mode 2 */}
          <button
            type="button"
            onClick={() => setSelectedMode('mode2_ru_to_en')}
            className={`p-6 rounded-2xl transition-all relative flex flex-col justify-between gap-4 cursor-pointer group text-left ${
              selectedMode === 'mode2_ru_to_en'
                ? `${theme.cardBg} ${theme.cardBorder} ${theme.glowEffect} ring-2 ring-white/50`
                : theme.isLight
                ? 'bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-md text-slate-800 shadow-xs'
                : 'bg-white/[0.03] border border-white/10 hover:border-white/20 text-slate-400'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-lg border ${
                selectedMode === 'mode2_ru_to_en'
                  ? theme.accentBadge
                  : theme.isLight
                  ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                  : 'bg-white/[0.06] text-slate-300 border-white/10'
              }`}>
                Формат 2 • Клавиша 2
              </span>
              {selectedMode === 'mode2_ru_to_en' && (
                <CheckCircle2 className={`w-5 h-5 ${theme.accentText}`} />
              )}
            </div>
            <div>
              <h3 className={`text-lg font-black mb-1.5 ${theme.textPrimary}`}>Русский → English</h3>
              <p className={`text-sm leading-relaxed ${theme.textSecondary}`}>
                Слово на русском с контекстным описанием. Ввод слова на английском.
              </p>
            </div>
          </button>

          {/* Mode 3 */}
          <button
            type="button"
            onClick={() => setSelectedMode('mode3_en_to_ru')}
            className={`p-6 rounded-2xl transition-all relative flex flex-col justify-between gap-4 cursor-pointer group text-left ${
              selectedMode === 'mode3_en_to_ru'
                ? `${theme.cardBg} ${theme.cardBorder} ${theme.glowEffect} ring-2 ring-white/50`
                : theme.isLight
                ? 'bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-md text-slate-800 shadow-xs'
                : 'bg-white/[0.03] border border-white/10 hover:border-white/20 text-slate-400'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-lg border ${
                selectedMode === 'mode3_en_to_ru'
                  ? theme.accentBadge
                  : theme.isLight
                  ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                  : 'bg-white/[0.06] text-slate-300 border-white/10'
              }`}>
                Формат 3 • Клавиша 3
              </span>
              {selectedMode === 'mode3_en_to_ru' && (
                <CheckCircle2 className={`w-5 h-5 ${theme.accentText}`} />
              )}
            </div>
            <div>
              <h3 className={`text-lg font-black mb-1.5 ${theme.textPrimary}`}>English → Русский</h3>
              <p className={`text-sm leading-relaxed ${theme.textSecondary}`}>
                Английское слово на экране. Ввод любого верного перевода на русском.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Mode 1 Specific Setting: Options count */}
      {selectedMode === 'mode1_choice' && (
        <div className={`${theme.cardBg} ${theme.cardBorder} rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn`}>
          <div>
            <div className={`text-base font-bold ${theme.textPrimary}`}>Количество вариантов ответа</div>
            <div className={`text-xs sm:text-sm ${theme.textSecondary}`}>Сколько вариантов перевода предлагать для каждого вопроса (от 2 до 7).</div>
          </div>
          <div className={`flex items-center gap-1.5 p-1.5 rounded-xl border shadow-xs ${
            theme.isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-black/30 border-white/10'
          }`}>
            {[2, 3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setNumOptions(num)}
                className={`w-10 h-9 rounded-lg text-sm font-extrabold transition-all cursor-pointer ${
                  numOptions === num
                    ? `${theme.primaryButton} shadow-xs`
                    : theme.isLight
                    ? 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-950 shadow-2xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Start Section */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className={`text-sm flex items-center gap-2.5 ${theme.textMuted}`}>
          <span className={`px-2.5 py-1 rounded-lg border font-bold text-xs ${theme.kbdBg}`}>Ctrl + Enter</span>
          <span>быстрый старт теста</span>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-bold text-base shadow-xl flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-98 ${theme.primaryButton}`}
        >
          <span>
            {sourceType === 'vocab_bank'
              ? totalUserWords === 0
                ? 'Открыть словарь'
                : `Начать тест (${availableInSelectedLevel} слов)`
              : 'Запустить тест'}
          </span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
