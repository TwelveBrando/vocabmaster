import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, Trash2, BookOpen, Layers, Award, Sparkles, Play, Loader2, FileInput } from 'lucide-react';
import type { CEFRLevel, DictionaryEntry, UITheme, AISettings } from '../types';
import { vocabularyService } from '../services/vocabularyService';
import { CEFR_LEVELS_META } from '../data/cefrDictionary';
import { THEMES } from '../styles/themes';
import { ImportWordsModal } from './ImportWordsModal';

interface ProfileScreenProps {
  currentTheme: UITheme;
  settings: AISettings;
  onStartVocabularyTest: (level?: CEFRLevel | 'all') => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentTheme,
  settings,
  onStartVocabularyTest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [selectedLetter, setSelectedLetter] = useState<string>('');
  const [onlySaved, setOnlySaved] = useState(false);
  const [userVocabWords, setUserVocabWords] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState(() => vocabularyService.getVocabularyStats());
  const [dictionaryList, setDictionaryList] = useState<DictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;

  const refreshVocabState = () => {
    const vocab = vocabularyService.getUserVocabulary();
    setUserVocabWords(new Set(vocab.map(v => v.word.toLowerCase())));
    setStats(vocabularyService.getVocabularyStats());
  };

  useEffect(() => {
    let isCancelled = false;
    const fetchWords = async () => {
      setIsLoading(true);
      try {
        const queryTerm = searchQuery.trim() || (selectedLetter ? selectedLetter.toLowerCase() : '');
        const results = await vocabularyService.searchDictionaryUniversal(queryTerm, selectedLevel, settings);
        if (!isCancelled) {
          if (onlySaved) {
            const vocab = vocabularyService.getUserVocabulary();
            const vocabSet = new Set(vocab.map(v => v.word.toLowerCase()));
            setDictionaryList(results.filter(item => vocabSet.has(item.word.toLowerCase())));
          } else {
            setDictionaryList(results);
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(fetchWords, searchQuery ? 200 : 0);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedLevel, selectedLetter, onlySaved, settings]);

  useEffect(() => {
    refreshVocabState();
  }, []);

  const handleToggleWord = async (entry: DictionaryEntry) => {
    await vocabularyService.toggleWordInVocabulary(entry);
    refreshVocabState();
  };

  const handleAddLevelBatch = (level: CEFRLevel) => {
    const wordsOfLevel = dictionaryList.filter(item => item.level === level);
    vocabularyService.addBatchToVocabulary(wordsOfLevel);
    refreshVocabState();
  };

  const handleImportBatch = (entries: DictionaryEntry[]) => {
    vocabularyService.addBatchToVocabulary(entries);
    refreshVocabState();
  };

  const handleClearAll = () => {
    if (window.confirm('Очистить весь ваш словарный запас?')) {
      vocabularyService.clearVocabulary();
      refreshVocabState();
    }
  };

  const handleSearchAIWord = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingAI(true);
    try {
      const newEntry = await vocabularyService.lookupUnknownWordWithAI(searchQuery, settings);
      await vocabularyService.toggleWordInVocabulary(newEntry);
      refreshVocabState();
      setSearchQuery('');
    } finally {
      setIsSearchingAI(false);
    }
  };

  const levelsList: (CEFRLevel | 'all')[] = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  return (
    <div className="w-full max-w-[1550px] mx-auto px-6 sm:px-10 py-8 flex flex-col gap-7 animate-fadeIn h-full flex-1 min-h-0 overflow-y-auto relative z-10 select-none">
      {/* Top Banner & Main Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-200/50 dark:border-white/[0.08]">
        <div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${theme.textPrimary}`}>
            Словарь & Профиль
          </h2>
          <p className={`text-sm sm:text-base mt-1.5 ${theme.textSecondary}`}>
            Формирование персонального словарного запаса и тренировка по уровням CEFR (A1–C2).
          </p>
        </div>

        {/* Clean, spacious action buttons bar */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className={`h-11 px-5 rounded-xl border text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-98 ${
              theme.isLight
                ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-white'
            }`}
          >
            <FileInput className="w-4 h-4 text-emerald-400" />
            <span>Импорт списком</span>
          </button>

          {stats.totalWords > 0 && (
            <button
              type="button"
              onClick={() => onStartVocabularyTest(selectedLevel)}
              className={`h-11 px-6 rounded-xl font-bold text-sm shadow-md flex items-center gap-2.5 transition-all cursor-pointer active:scale-98 ${theme.primaryButton}`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Тестировать мой словарь ({stats.totalWords})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Balanced Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Words Card */}
        <div className={`${theme.cardBg} ${theme.cardBorder} p-5.5 rounded-2xl shadow-sm flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            theme.isLight ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
          }`}>
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>В вашем запасе</div>
            <div className={`text-3xl font-extrabold ${theme.textPrimary}`}>{stats.totalWords} <span className="text-sm font-semibold opacity-70">слов</span></div>
          </div>
        </div>

        {/* CEFR Level Breakdown */}
        <div className={`${theme.cardBg} ${theme.cardBorder} p-5.5 rounded-2xl shadow-sm flex flex-col justify-between gap-2.5`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.textMuted}`}>
              <Layers className="w-4 h-4" />
              Распределение по уровням
            </span>
            <span className={`text-xs font-bold ${theme.accentText}`}>A1–C2</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map(lvl => {
              const count = stats.byLevel[lvl] || 0;
              return (
                <div
                  key={lvl}
                  className={`flex flex-col items-center py-2 rounded-xl border transition-all shadow-2xs ${
                    theme.isLight
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-white/[0.04] border-white/10 text-white'
                  }`}
                >
                  <span className="text-xs font-black" style={{ color: CEFR_LEVELS_META[lvl].colorHex }}>{lvl}</span>
                  <span className={`text-xs font-extrabold mt-0.5 ${
                    count > 0
                      ? theme.isLight ? 'text-slate-950' : theme.textPrimary
                      : theme.isLight ? 'text-slate-400 font-normal' : 'text-slate-500 opacity-40'
                  }`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accuracy */}
        <div className={`${theme.cardBg} ${theme.cardBorder} p-5.5 rounded-2xl shadow-sm flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            theme.isLight ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}>
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Точность в тестах</div>
            <div className={`text-3xl font-extrabold ${theme.textPrimary}`}>
              {stats.totalTests > 0 ? `${stats.accuracy}%` : '—'}{' '}
              <span className="text-sm font-semibold opacity-70">({stats.totalTests} ответов)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          {/* Search Input */}
          <div className="relative flex-1">
            {isLoading ? (
              <Loader2 className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${theme.accentText} animate-spin`} />
            ) : (
              <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedLetter) setSelectedLetter('');
              }}
              placeholder="Поиск по всему английскому словарю (например: answerable, prescription, serendipity)..."
              className={`w-full pl-11 pr-5 py-3 rounded-xl ${theme.inputBg} ${theme.cardBorder} ${theme.inputText} ${theme.inputPlaceholder} text-base focus:outline-none ${theme.inputFocus} transition-all shadow-inner`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold cursor-pointer ${
                  theme.isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Очистить
              </button>
            )}
          </div>

          {/* Only In Bank Filter */}
          <button
            type="button"
            onClick={() => setOnlySaved(!onlySaved)}
            className={`h-11 px-5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 shadow-xs ${
              onlySaved
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                : theme.isLight
                ? 'bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            <Check className={`w-4 h-4 ${onlySaved ? 'stroke-[3]' : 'opacity-40'}`} />
            <span>Только в моем словаре ({userVocabWords.size})</span>
          </button>
        </div>

        {/* Alphabet Line (A to Z) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedLetter('');
              setSearchQuery('');
            }}
            className={`px-3.5 py-1.5 rounded-lg border font-extrabold transition-all cursor-pointer shadow-2xs ${
              !selectedLetter && !searchQuery
                ? `${theme.primaryButton} shadow-xs`
                : theme.isLight
                ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-950'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            Все
          </button>
          {ALPHABET.map((char) => {
            const isSelected = selectedLetter === char && !searchQuery;
            return (
              <button
                key={char}
                type="button"
                onClick={() => {
                  setSelectedLetter(char);
                  setSearchQuery('');
                }}
                className={`w-7 h-7 rounded-lg border font-extrabold transition-all cursor-pointer flex items-center justify-center text-xs shadow-2xs ${
                  isSelected
                    ? `${theme.primaryButton} shadow-xs`
                    : theme.isLight
                    ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-950'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {char}
              </button>
            );
          })}
        </div>

        {/* Level Filters + Quick Actions */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border shadow-xs ${
            theme.isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-black/40 border-white/10'
          }`}>
            {levelsList.map((lvl) => {
              const isActive = selectedLevel === lvl;
              const meta = lvl !== 'all' ? CEFR_LEVELS_META[lvl] : null;

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? `${theme.primaryButton} shadow-sm`
                      : theme.isLight
                      ? 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-950 shadow-2xs'
                      : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {meta && (
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20 dark:ring-white/30 shadow-xs shrink-0"
                      style={{ backgroundColor: meta.colorHex }}
                    />
                  )}
                  <span>{lvl === 'all' ? 'Все уровни' : lvl}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Batch Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {selectedLevel !== 'all' && dictionaryList.length > 0 && (
              <button
                type="button"
                onClick={() => handleAddLevelBatch(selectedLevel)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 ${
                  theme.isLight
                    ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-400 text-emerald-950'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Добавить {selectedLevel} ({dictionaryList.length})</span>
              </button>
            )}

            {userVocabWords.size > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                title="Очистить весь словарный запас"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dictionary Words Grid (Responsive 4-Column Layout) */}
      <div className="flex flex-col gap-3 pb-8">
        {dictionaryList.length === 0 && !isLoading ? (
          <div className={`${theme.cardBg} ${theme.cardBorder} p-12 rounded-2xl text-center flex flex-col items-center gap-4`}>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${theme.textPrimary}`}>
                Слово не найдено в словаре
              </h3>
              <p className={`text-sm mt-1 ${theme.textSecondary}`}>
                Вы можете добавить его в свой словарный запас с помощью ИИ, который определит точный перевод и уровень CEFR.
              </p>
            </div>
            {searchQuery && (
              <button
                type="button"
                disabled={isSearchingAI}
                onClick={handleSearchAIWord}
                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-98 ${theme.primaryButton}`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSearchingAI ? 'ИИ определяет уровень...' : `Добавить «${searchQuery}» через ИИ`}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {dictionaryList.map((entry) => {
              const isSaved = userVocabWords.has(entry.word.toLowerCase());
              const levelMeta = CEFR_LEVELS_META[entry.level] || CEFR_LEVELS_META.B1;
              const hasCleanRussian = entry.russian && entry.russian.toLowerCase() !== entry.word.toLowerCase();

              return (
                <div
                  key={entry.id}
                  onClick={() => handleToggleWord(entry)}
                  className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 relative select-none group active:scale-98 ${
                    isSaved
                      ? theme.isLight
                        ? 'bg-emerald-50/95 border-2 border-emerald-400 text-emerald-950 shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-emerald-950/40 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : theme.isLight
                      ? 'bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-md text-slate-900 shadow-xs'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-base font-black tracking-tight capitalize ${theme.textPrimary}`}>
                        {entry.word}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${levelMeta.badgeClass}`}>
                        {entry.level}
                      </span>
                      <span className={`text-xs ${theme.textMuted}`}>
                        ({entry.partOfSpeech})
                      </span>
                    </div>
                    <div className={`text-sm font-bold leading-relaxed truncate ${theme.textSecondary}`}>
                      {hasCleanRussian ? entry.russian : (entry.disambiguationHint || entry.russian || 'перевод...')}
                    </div>
                    {entry.disambiguationHint && entry.disambiguationHint !== entry.russian && (
                      <div className={`text-xs line-clamp-1 ${theme.textMuted}`}>
                        {entry.disambiguationHint}
                      </div>
                    )}
                  </div>

                  {/* Toggle Button */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                    isSaved
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                      : theme.isLight
                      ? 'border-2 border-slate-300 text-slate-600 group-hover:border-slate-500 group-hover:text-slate-950 group-hover:bg-slate-100 bg-slate-50'
                      : 'border-white/15 text-slate-400 group-hover:border-white/30 group-hover:text-white bg-white/5'
                  }`}>
                    {isSaved ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Import Words Modal */}
      <ImportWordsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportBatch}
        currentTheme={currentTheme}
      />
    </div>
  );
};
