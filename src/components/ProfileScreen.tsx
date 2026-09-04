import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, Trash2, BookMarked, Layers, Award, Sparkles, Play, Loader2, FileInput, History, Download, Eraser, Pause, Square, PlayCircle } from 'lucide-react';
import type { CEFRLevel, DictionaryEntry, UITheme, AISettings } from '../types';
import { vocabularyService } from '../services/vocabularyService';
import { CEFR_LEVELS_META } from '../data/cefrDictionary';
import { THEMES } from '../styles/themes';
import { ImportWordsModal } from './ImportWordsModal';
import { cloudSyncService, type TestAttempt } from '../services/cloudSyncService';
import { AIService } from '../services/aiService';

interface ProfileScreenProps {
  currentTheme: UITheme;
  settings: AISettings;
  vocabularyRevision: number;
  onStartVocabularyTest: (level?: CEFRLevel | 'all') => void;
  onVocabularyPrepared?: () => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentTheme,
  settings,
  vocabularyRevision,
  onStartVocabularyTest,
  onVocabularyPrepared,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('');
  const [onlySaved, setOnlySaved] = useState(false);
  const [userVocabWords, setUserVocabWords] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState(() => vocabularyService.getVocabularyStats());
  const [dictionaryList, setDictionaryList] = useState<DictionaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [history, setHistory] = useState<TestAttempt[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [preparedWords, setPreparedWords] = useState(() => vocabularyService.getPreparedVocabularyCount());
  const [downloadProgress, setDownloadProgress] = useState<{ processed: number; total: number } | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const [isDownloadPaused, setIsDownloadPaused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchInteractedRef = useRef(false);
  const downloadControllerRef = useRef<AbortController | null>(null);
  const isDownloadPausedRef = useRef(false);
  const resumeDownloadRef = useRef<(() => void) | null>(null);

  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;
  // While a queue runs, both the card and progress bar must describe the same thing:
  // context that is actually available for tests, rather than queue attempts.
  const contextProgressTotal = downloadProgress?.total ?? stats.totalWords;
  const visiblePreparedWords = Math.min(preparedWords, contextProgressTotal);

  const refreshVocabState = () => {
    const vocab = vocabularyService.getUserVocabulary();
    setUserVocabWords(new Set(vocab.map(v => v.word.toLowerCase())));
    setStats(vocabularyService.getVocabularyStats());
    setPreparedWords(vocabularyService.getPreparedVocabularyCount());
  };

  useEffect(() => {
    let isCancelled = false;
    const fetchWords = async () => {
      setIsLoading(true);
      try {
        const queryTerm = searchQuery.trim() || (selectedLetter ? selectedLetter.toLowerCase() : '');
        const results = await vocabularyService.searchDictionaryUniversal(queryTerm, 'all', settings);
        if (!isCancelled) {
          // Datamuse already searches by prefix, but locally saved words used to be
          // added by a broad "contains" match. Keep an initial-letter filter exact.
          const letterFiltered = selectedLetter && !searchQuery.trim()
            ? results.filter(item => item.word.trim().toLowerCase().startsWith(selectedLetter.toLowerCase()))
            : results;
          if (onlySaved) {
            const vocab = vocabularyService.getUserVocabulary();
            const vocabSet = new Set(vocab.map(v => v.word.toLowerCase()));
            setDictionaryList(letterFiltered.filter(item => vocabSet.has(item.word.toLowerCase())));
          } else {
            setDictionaryList(letterFiltered);
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
  }, [searchQuery, selectedLetter, onlySaved, settings, vocabularyRevision]);

  useEffect(() => {
    refreshVocabState();
  }, [vocabularyRevision]);

  useEffect(() => {
    if (!cloudSyncService.isLoggedIn()) return;
    setIsHistoryLoading(true);
    cloudSyncService.loadHistory().then(setHistory).catch(() => {}).finally(() => setIsHistoryLoading(false));
  }, []);

  useEffect(() => {
    const clearUnexpectedAutofill = () => {
      if (searchInteractedRef.current || !searchInputRef.current) return;
      searchInputRef.current.value = '';
      setSearchQuery('');
    };
    const timers = [0, 250, 1000].map(delay => window.setTimeout(clearUnexpectedAutofill, delay));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, []);

  const handleToggleWord = async (entry: DictionaryEntry) => {
    await vocabularyService.toggleWordInVocabulary(entry);
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

  const handleDownloadVocabulary = async () => {
    const words = vocabularyService.getTestWordsFromVocabulary('all');
    if (words.length === 0) return;
    if (!settings.apiKey?.trim()) {
      setDownloadError('Сначала добавьте API-ключ провайдера в настройках.');
      return;
    }

    const controller = new AbortController();
    downloadControllerRef.current = controller;
    isDownloadPausedRef.current = false;
    setIsDownloadPaused(false);
    setDownloadError('');
    setDownloadProgress({ processed: 0, total: words.length });
    try {
      const { errors } = await AIService.fetchWordsData(
        words,
        settings,
        (processed, total) => setDownloadProgress({ processed, total }),
        (batch, processed, total) => {
          // Keep each completed batch even if the user stops the remaining queue.
          vocabularyService.applyAIEnrichment(batch);
          setPreparedWords(vocabularyService.getPreparedVocabularyCount());
          setDownloadProgress({ processed, total });
        },
        {
          signal: controller.signal,
          waitForResume: () => new Promise<void>(resolve => {
            if (!isDownloadPausedRef.current) {
              resolve();
              return;
            }
            resumeDownloadRef.current = resolve;
          }),
        },
      );
      refreshVocabState();
      onVocabularyPrepared?.();
      if (errors.length > 0) setDownloadError(errors[0]);
    } catch (error) {
      if (controller.signal.aborted) {
        setDownloadError('Загрузка остановлена. Уже готовый контекст сохранён.');
      } else {
        setDownloadError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (downloadControllerRef.current === controller) {
        downloadControllerRef.current = null;
        resumeDownloadRef.current = null;
        isDownloadPausedRef.current = false;
        setIsDownloadPaused(false);
        setDownloadProgress(null);
        refreshVocabState();
        onVocabularyPrepared?.();
      }
    }
  };

  const handleToggleDownloadPause = () => {
    if (!downloadControllerRef.current) return;
    if (isDownloadPausedRef.current) {
      isDownloadPausedRef.current = false;
      setIsDownloadPaused(false);
      resumeDownloadRef.current?.();
      resumeDownloadRef.current = null;
    } else {
      isDownloadPausedRef.current = true;
      setIsDownloadPaused(true);
    }
  };

  const handleStopDownload = () => {
    const controller = downloadControllerRef.current;
    if (!controller) return;
    isDownloadPausedRef.current = false;
    resumeDownloadRef.current?.();
    resumeDownloadRef.current = null;
    controller.abort();
  };

  const handleClearVocabularyContext = () => {
    if (preparedWords === 0) return;
    if (!window.confirm('Очистить загруженный контекст? Слова, переводы и статистика останутся.')) return;

    vocabularyService.clearPreparedVocabularyContexts();
    setDownloadError('');
    refreshVocabState();
    onVocabularyPrepared?.();
  };

  return (
    <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-[1550px] flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 animate-fadeIn select-none sm:gap-7 sm:px-10 sm:py-8">
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
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className={`h-10 px-2.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
              theme.isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                : 'text-white/65 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            <FileInput className="w-4 h-4 text-emerald-400" />
            <span>Импорт</span>
          </button>

          {stats.totalWords > 0 && (
            <button
              type="button"
              onClick={() => onStartVocabularyTest('all')}
            className={`h-11 flex-1 sm:flex-none px-3 sm:px-6 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${theme.primaryButton}`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="sm:hidden">Тестировать ({stats.totalWords})</span><span className="hidden sm:inline">Тестировать мой словарь ({stats.totalWords})</span>
            </button>
          )}
        </div>
      </div>

      {/* Balanced Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Words Card */}
        <div className={`${theme.cardBg} ${theme.cardBorder} p-5.5 rounded-2xl shadow-sm flex items-center gap-4`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            theme.isLight ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-white/[0.09] text-white/90 border border-white/20'
          }`}>
            <BookMarked className="w-6 h-6" strokeWidth={1.7} />
          </div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>В вашем запасе</div>
            <div className={`text-3xl font-extrabold ${theme.textPrimary}`}>{stats.totalWords} <span className="text-sm font-semibold opacity-70">слов</span></div>
          </div>
        </div>

        <div className={`${theme.cardBg} ${theme.cardBorder} p-5.5 rounded-2xl shadow-sm flex flex-col justify-between gap-3`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              theme.isLight ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
            }`}>
              <Download className="w-6 h-6" strokeWidth={1.7} />
            </div>
            <div>
              <div className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Контекст загружен</div>
              <div className={`text-3xl font-extrabold ${theme.textPrimary}`}>{visiblePreparedWords} <span className="text-sm font-semibold opacity-70">из {contextProgressTotal}</span></div>
            </div>
          </div>
          {downloadProgress && (
            <div className={`rounded-full h-1.5 overflow-hidden ${theme.progressTrack}`}>
              <div className={`h-full rounded-full transition-all duration-300 ${theme.progressFill}`} style={{ width: `${contextProgressTotal ? Math.round((visiblePreparedWords / contextProgressTotal) * 100) : 0}%` }} />
            </div>
          )}
          {downloadError && <div className="text-[11px] font-semibold text-amber-500">{downloadError}</div>}
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-2.5 ${theme.isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <button type="button" disabled={Boolean(downloadProgress) || stats.totalWords === 0} onClick={handleDownloadVocabulary} className={`flex items-center gap-1.5 text-xs font-bold transition ${downloadProgress ? 'cursor-wait opacity-60' : `${theme.accentText} cursor-pointer hover:opacity-75`}`}>
              {downloadProgress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {downloadProgress ? `${visiblePreparedWords}/${contextProgressTotal}` : 'Загрузить'}
            </button>
            {downloadProgress && (
              <>
                <button type="button" onClick={handleToggleDownloadPause} className={`flex items-center gap-1.5 text-xs font-semibold transition ${theme.textMuted} cursor-pointer hover:opacity-75`}>
                  {isDownloadPaused ? <PlayCircle className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {isDownloadPaused ? 'Продолжить' : 'Пауза'}
                </button>
                <button type="button" onClick={handleStopDownload} className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 transition hover:opacity-75 cursor-pointer">
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Остановить
                </button>
              </>
            )}            <button type="button" disabled={preparedWords === 0 || Boolean(downloadProgress)} onClick={handleClearVocabularyContext} className={`flex items-center gap-1.5 text-xs font-semibold transition ${preparedWords === 0 || downloadProgress ? 'cursor-not-allowed opacity-35' : `${theme.textMuted} cursor-pointer hover:text-rose-500`}`}>
              <Eraser className="h-3.5 w-3.5" />
              Очистить
            </button>
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
                      ? 'text-slate-950 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 opacity-70 font-normal'
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

      {cloudSyncService.isLoggedIn() && (
        <section className={`${theme.cardBg} ${theme.cardBorder} rounded-2xl border p-5 shadow-sm flex flex-col gap-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><History className={`w-5 h-5 ${theme.accentText}`} /><h3 className={`font-extrabold ${theme.textPrimary}`}>История тестов</h3></div>
            <span className={`text-xs ${theme.textMuted}`}>Последние 20 попыток</span>
          </div>
          {isHistoryLoading ? <div className={`text-sm ${theme.textMuted}`}>Загружаем историю…</div> : history.length === 0 ? <div className={`text-sm ${theme.textMuted}`}>Завершите первый тест — его результат появится здесь.</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {history.map(attempt => {
                const accuracy = attempt.totalQuestions ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100) : 0;
                return <div key={attempt.id} className={`rounded-xl border p-3 ${theme.isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
                  <div className={`text-sm font-bold ${theme.textPrimary}`}>{accuracy}% · {attempt.correctAnswers}/{attempt.totalQuestions}</div>
                  <div className={`text-xs mt-1 ${theme.textMuted}`}>{new Date(attempt.completedAt).toLocaleString('ru-RU')}</div>
                </div>;
              })}
            </div>
          )}
        </section>
      )}

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
              ref={searchInputRef}
              type="search"
              name="vocabmaster-dictionary-query"
              autoComplete="off"
              data-form-type="other"
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
              autoCapitalize="none"
              spellCheck={false}
              value={searchQuery}
              onPointerDown={() => { searchInteractedRef.current = true; }}
              onKeyDown={() => { searchInteractedRef.current = true; }}
              onPaste={() => { searchInteractedRef.current = true; }}
              onChange={(e) => {
                if (!searchInteractedRef.current) {
                  e.currentTarget.value = searchQuery;
                  return;
                }
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

        <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
          theme.isLight ? 'bg-slate-100/80 border-slate-200 text-slate-600' : 'bg-white/[0.03] border-white/10 text-slate-400'
        }`}>
          <p className="text-xs leading-relaxed">
            В каталоге нет искусственного «выбора уровня»: уровни у слов — ориентир сложности, а поиск находит слова из полного доступного словаря.
          </p>
          {userVocabWords.size > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0"
              title="Очистить весь словарный запас"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
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
                Можно добавить его в словарный запас с автоматическим определением перевода и уровня CEFR.
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
                <span>{isSearchingAI ? 'Определяем уровень...' : `Добавить «${searchQuery}» с автопереводом`}</span>
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
                  className={`dictionary-word-card p-4.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 relative select-none group active:scale-98 ${
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
