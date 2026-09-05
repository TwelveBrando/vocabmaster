import { useState, useEffect, useCallback, useRef } from 'react';
import Lenis from 'lenis';
import { Header } from './components/Header';
import { SetupScreen } from './components/SetupScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { PreparationScreen } from './components/PreparationScreen';
import { TestScreen } from './components/TestScreen';
import { ResultScreen } from './components/ResultScreen';
import { SettingsModal } from './components/SettingsModal';
import LiquidMetalHero from './components/ui/liquid-metal-hero';
import { LiquidMetal, liquidMetalPresets } from '@paper-design/shaders-react';
import { GrammarExerciseScreen } from './components/grammar/GrammarExerciseScreen';
import { GrammarHubScreen } from './components/grammar/GrammarHubScreen';
import { GrammarLectureScreen } from './components/grammar/GrammarLectureScreen';
import { AuthModal } from './components/AuthModal';
import type { TestMode, AISettings, TestQuestion, QuestionResult, CachedWordData, CEFRLevel, UITheme, UserVocabularyItem } from './types';
import type { GrammarLecture } from './types/grammar';
import { grammarService } from './services/grammarService';
import { settingsService } from './services/settingsService';
import { cacheService } from './services/cacheService';
import { vocabularyService } from './services/vocabularyService';
import { AIService } from './services/aiService';
import { buildTestQuestions } from './services/testBuilder';
import { determineWordCEFRLevel, parseVocabularyInput } from './services/wordParser';
import { getSmartFallbackDistractors } from './services/distractorPool';
import { translatorService } from './services/translatorService';
import { THEMES } from './styles/themes';
import { cloudSyncService, type CloudUser } from './services/cloudSyncService';
import { usePerformanceProfile } from './hooks/usePerformanceProfile';

import type { SessionState } from './services/settingsService';

function mergeVocabulary(remote: UserVocabularyItem[], local: UserVocabularyItem[]): UserVocabularyItem[] {
  const byWord = new Map<string, UserVocabularyItem>();
  for (const item of [...remote, ...local]) {
    const key = item.word.toLowerCase().trim();
    const existing = byWord.get(key);
    if (!existing) {
      byWord.set(key, item);
      continue;
    }
    const newer = (item.lastTestedAt || item.addedAt || 0) >= (existing.lastTestedAt || existing.addedAt || 0) ? item : existing;
    const older = newer === item ? existing : item;
    const testsCount = Math.max(existing.testsCount || 0, item.testsCount || 0);
    byWord.set(key, {
      ...older,
      ...newer,
      addedAt: Math.min(existing.addedAt || Date.now(), item.addedAt || Date.now()),
      testsCount,
      correctCount: Math.min(testsCount, Math.max(existing.correctCount || 0, item.correctCount || 0)),
      lastTestedAt: Math.max(existing.lastTestedAt || 0, item.lastTestedAt || 0) || undefined,
    });
  }
  return [...byWord.values()].sort((a, b) => b.addedAt - a.addedAt);
}

export function App() {
  const scrollWrapperRef = useRef<HTMLElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [appState, setAppState] = useState<
    'setup' | 'profile' | 'preparing' | 'testing' | 'results' | 'grammar_hub' | 'grammar_lecture' | 'grammar_exercise'
  >('setup');
  const [settings, setSettings] = useState<AISettings>(() => settingsService.getSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [vocabCount, setVocabCount] = useState(0);
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [vocabularyRevision, setVocabularyRevision] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isWelcomeScreenOpen, setIsWelcomeScreenOpen] = useState(true);
  const [isContentScrolled, setIsContentScrolled] = useState(false);
  const performanceProfile = usePerformanceProfile();

  // Grammar Module State
  const [currentGrammarLecture, setCurrentGrammarLecture] = useState<GrammarLecture | null>(null);

  // Persistent Session state
  const [sessionState, setSessionState] = useState<SessionState>(() => settingsService.getSessionState());

  // Preparation state
  const [prepProgress, setPrepProgress] = useState({ processed: 0, total: 0, message: '' });
  const [prepErrors, setPrepErrors] = useState<string[]>([]);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [testRunId, setTestRunId] = useState(0);
  const testPreparationRunRef = useRef(0);

  // Test state
  const [testSourceType, setTestSourceType] = useState<'vocab_bank' | 'custom_input'>('custom_input');
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [testResults, setTestResults] = useState<QuestionResult[]>([]);
  const [currentWordsData, setCurrentWordsData] = useState<CachedWordData[]>([]);

  const currentTheme: UITheme = settings.theme in THEMES ? settings.theme : 'language_explorer';
  const currentThemeConfig = THEMES[currentTheme];


  useEffect(() => {
    // Wake the serverless API while the app opens, before the user needs the login form.
    cloudSyncService.warmUp();
  }, []);

  const refreshCounts = useCallback(() => {
    setCachedCount(cacheService.getAllCachedWords().length);
    setVocabCount(vocabularyService.getUserVocabulary().length);
  }, []);

  const hydrateCloudVocabulary = useCallback(async () => {
    const remote = await cloudSyncService.loadVocabulary();
    const merged = mergeVocabulary(remote, vocabularyService.getUserVocabulary());
    // Do not let a fresh browser's empty localStorage overwrite the account before
    // its cloud vocabulary has been loaded and merged.
    vocabularyService.saveUserVocabulary(merged, false);
    refreshCounts();
    setVocabularyRevision((revision) => revision + 1);
    await cloudSyncService.saveVocabulary(merged);
  }, [refreshCounts]);

  const startCloudSession = useCallback((user: CloudUser) => {
    setCloudUser(user);
    void hydrateCloudVocabulary().catch(() => {
      // Authentication is still valid even if a later vocabulary sync is temporarily unavailable.
    });
  }, [hydrateCloudVocabulary]);

  useEffect(() => {
    refreshCounts();
    // Sync settings from permanent disk storage if available in Electron
    settingsService.syncWithDisk().then((synced) => {
      if (synced) {
        setSettings(synced);
      }
    }).catch(() => {});
  }, [refreshCounts]);

  useEffect(() => {
    cloudSyncService.currentUser().then(async (user) => {
      if (!user) return;
      startCloudSession(user);
    }).catch(() => {});
  }, [startCloudSession]);

  // Augen.pro uses Lenis.  Keeping it scoped to the application content (rather
  // than replacing window scrolling) lets Electron and the web app keep their
  // existing layout and prevents a missing page scroll on short screens.
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    const content = scrollContentRef.current;
    if (!wrapper || !content || performanceProfile.prefersReducedMotion || performanceProfile.lightweightRendering) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      autoRaf: false,
    });

    let animationFrame = 0;
    const renderScroll = (time: number) => {
      if (!document.hidden) lenis.raf(time);
      animationFrame = window.requestAnimationFrame(renderScroll);
    };
    animationFrame = window.requestAnimationFrame(renderScroll);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      lenis.destroy();
    };
  }, [isWelcomeScreenOpen, performanceProfile.prefersReducedMotion, performanceProfile.lightweightRendering]);

  const handleSaveSettings = (newSettings: AISettings) => {
    setSettings(newSettings);
    settingsService.saveSettings(newSettings);
  };

  const handleSessionStateChange = useCallback((updated: Partial<SessionState>) => {
    setSessionState((prev) => {
      const next = { ...prev, ...updated };
      settingsService.saveSessionState(next);
      return next;
    });
  }, []);

  const streamAIPreparedTest = async (
    inputItems: (string | CachedWordData)[],
    mode: TestMode,
    numOptions: number,
    onComplete?: (data: CachedWordData[]) => void,
  ) => {
    const runId = ++testPreparationRunRef.current;
    const readyWords = new Set<string>();
    setTestRunId(runId);
    setTestQuestions([]);
    setCurrentWordsData([]);
    setPrepErrors([]);
    setIsQuestionLoading(true);
    setPrepProgress({ processed: 0, total: inputItems.length, message: 'Готовим первую пачку слов...' });
    setAppState('preparing');

    try {
      const { data, errors } = await AIService.fetchWordsData(
        inputItems,
        settings,
        (processed, total, message) => {
          if (testPreparationRunRef.current === runId) {
            setPrepProgress({ processed, total, message });
          }
        },
        (batch, processed, total) => {
          if (testPreparationRunRef.current !== runId) return;
          const uniqueBatch = batch.filter(item => {
            const key = item.english.toLowerCase().trim();
            if (!key || readyWords.has(key)) return false;
            readyWords.add(key);
            return true;
          });
          if (uniqueBatch.length === 0) return;

          setCurrentWordsData(previous => [...previous, ...uniqueBatch]);
          setTestQuestions(previous => [...previous, ...buildTestQuestions(uniqueBatch, mode, numOptions)]);
          setPrepProgress({
            processed,
            total,
            message: processed < total ? 'Готовим следующие слова...' : 'Все слова готовы',
          });
          setAppState('testing');
        },
      );

      if (testPreparationRunRef.current !== runId) return;
      onComplete?.(data);
      refreshCounts();
      if (errors.length > 0) setPrepErrors(errors);
      setPrepProgress({ processed: data.length, total: inputItems.length, message: 'Все слова готовы' });
      setIsQuestionLoading(false);
      if (data.length > 0) setAppState('testing');
    } catch (err: unknown) {
      if (testPreparationRunRef.current !== runId) return;
      const errorMsg = err instanceof Error ? err.message : String(err);
      setPrepErrors([`Не удалось подготовить слова: ${errorMsg}`]);
      setIsQuestionLoading(false);
    }
  };

  // START TEST VIA CUSTOM TEXT INPUT
  const startCustomTextTest = async (
    inputText: string,
    mode: TestMode,
    numOptions: number
  ) => {
    if (!inputText.trim()) return;

    setTestSourceType('custom_input');
    handleSessionStateChange({ inputText, mode, numOptions, sourceType: 'custom_input' });

    const parsed = parseVocabularyInput(inputText);
    const inputItems: (string | CachedWordData)[] = parsed.isFormattedWithTranslations
      ? parsed.wordsData
      : parsed.rawWords;

    if (inputItems.length === 0) return;

    const hasApiKey = settings.apiKey && settings.apiKey.trim() !== '';

    if (!hasApiKey) {
      const runId = ++testPreparationRunRef.current;
      setTestRunId(runId);
      setIsQuestionLoading(false);
      const dataWithSmartDistractors: CachedWordData[] = parsed.isFormattedWithTranslations
        ? parsed.wordsData
        : await Promise.all(inputItems.map(async (item) => {
            const eng = typeof item === 'string' ? item : item.english;
            // Do not reuse the old test cache here: it can contain a stale or
            // malformed AI answer. The translation pipeline has its own cache
            // and always validates against the built-in dictionary first.
            const translation = await translatorService.translateWord(eng, settings);
            const russian = translation.russian || eng;
            return {
              english: eng,
              russian,
              disambiguationHint: translation.disambiguationHint || russian,
              distractors: getSmartFallbackDistractors(russian, 6, eng),
              acceptableRussian: [russian],
              acceptableEnglish: [eng.toLowerCase()],
              level: determineWordCEFRLevel(eng),
              timestamp: Date.now(),
            };
          }));

      cacheService.saveBatchWords(dataWithSmartDistractors);
      refreshCounts();
      setCurrentWordsData(dataWithSmartDistractors);

      const questions = buildTestQuestions(dataWithSmartDistractors, mode, numOptions);
      setTestQuestions(questions);
      setAppState('testing');
      return;
    }

    await streamAIPreparedTest(inputItems, mode, numOptions);
  };

  // START TEST DIRECTLY FROM PERSONAL VOCABULARY BANK
  const startVocabularyBankTest = async (
    level: CEFRLevel | 'all' = sessionState.bankLevel || 'all',
    count: number = sessionState.bankWordCount || 15,
    mode: TestMode = sessionState.mode,
    numOptions: number = sessionState.numOptions
  ) => {
    handleSessionStateChange({ bankLevel: level, bankWordCount: count, mode, numOptions, sourceType: 'vocab_bank' });
    const words = vocabularyService.getTestWordsFromVocabulary(level, count);
    if (words.length === 0) return;

    setTestSourceType('vocab_bank');
    const hasApiKey = settings.apiKey && settings.apiKey.trim() !== '';

    if (!hasApiKey) {
      const runId = ++testPreparationRunRef.current;
      setTestRunId(runId);
      setIsQuestionLoading(false);
      setCurrentWordsData(words);
      setTestQuestions(buildTestQuestions(words, mode, numOptions));
      setAppState('testing');
      return;
    }

    await streamAIPreparedTest(words, mode, numOptions, data => {
      vocabularyService.applyAIEnrichment(data);
      setVocabularyRevision(revision => revision + 1);
    });
  };

  const handleFinishTest = (results: QuestionResult[]) => {
    testPreparationRunRef.current += 1;
    setIsQuestionLoading(false);
    setTestResults(results);
    // Record accuracy for vocabulary items
    for (const r of results) {
      vocabularyService.recordTestResult(r.question.originalWord, r.isCorrect);
    }
    refreshCounts();
    if (cloudSyncService.isLoggedIn()) {
      void cloudSyncService.saveVocabulary(vocabularyService.getUserVocabulary());
      void cloudSyncService.saveHistory(sessionState.mode, results);
    }
    setAppState('results');
  };

  const handleRestartAll = () => {
    if (currentWordsData.length > 0) {
      const runId = ++testPreparationRunRef.current;
      setTestRunId(runId);
      setIsQuestionLoading(false);
      const questions = buildTestQuestions(currentWordsData, sessionState.mode, sessionState.numOptions);
      setTestQuestions(questions);
      setAppState('testing');
    } else {
      if (testSourceType === 'vocab_bank') {
        startVocabularyBankTest(sessionState.bankLevel, sessionState.bankWordCount, sessionState.mode, sessionState.numOptions);
      } else {
        startCustomTextTest(sessionState.inputText, sessionState.mode, sessionState.numOptions);
      }
    }
  };

  const handleRestartMistakesOnly = () => {
    const mistakeWordsSet = new Set(
      testResults
        .filter((r) => !r.isCorrect)
        .map((r) => r.question.originalWord.toLowerCase())
    );

    const mistakeItems = currentWordsData.filter((item) =>
      mistakeWordsSet.has(item.english.toLowerCase())
    );

    if (mistakeItems.length > 0) {
      const runId = ++testPreparationRunRef.current;
      setTestRunId(runId);
      setIsQuestionLoading(false);
      const questions = buildTestQuestions(mistakeItems, sessionState.mode, sessionState.numOptions);
      setTestQuestions(questions);
      setAppState('testing');
    }
  };

  const handleBackToSetup = () => {
    testPreparationRunRef.current += 1;
    setIsQuestionLoading(false);
    setAppState('setup');
  };

  const handleSelectSubtopic = (subtopicId: string) => {
    const lecture = grammarService.getLectureBySubtopicId(subtopicId);
    if (lecture) {
      setCurrentGrammarLecture(lecture);
      setAppState('grammar_lecture');
    }
  };

  const isGrammarActive = appState === 'grammar_hub' || appState === 'grammar_lecture' || appState === 'grammar_exercise';

  if (isWelcomeScreenOpen) {
    return (
      <LiquidMetalHero
        badge="VocabMaster · интерактивное обучение"
        title="Учи слова. Понимай язык."
        subtitle="Персональный тренажёр английской лексики и грамматики — с тестами, словарём и понятными уроками."
        primaryCtaLabel="Начать тренировку"
        secondaryCtaLabel="Открыть словарь"
        onPrimaryCtaClick={() => setIsWelcomeScreenOpen(false)}
        onSecondaryCtaClick={() => {
          setAppState('profile');
          setIsWelcomeScreenOpen(false);
        }}
        features={["Тесты по вашим словам", "Грамматика A1", "Личный словарь"]}
        shaderMaxPixelCount={performanceProfile.shaderMaxPixelCount}
        shaderMinPixelRatio={performanceProfile.shaderMinPixelRatio}
        prefersReducedMotion={performanceProfile.prefersReducedMotion}
        lightweightRendering={performanceProfile.lightweightRendering}
      />
    );
  }

  return (
    <div className={`vocab-app theme-${currentTheme} h-[100dvh] ${currentThemeConfig.pageBg} flex flex-col font-sans relative overflow-hidden transition-colors duration-500`}>
      {currentTheme === 'language_explorer' ? (
        <div className="pointer-events-none fixed inset-0 z-0">
          <LiquidMetal
            {...liquidMetalPresets[2].params}
            colorBack="#080808"
            colorTint="#e7e7e4"
            speed={performanceProfile.prefersReducedMotion ? 0 : performanceProfile.lightweightRendering ? 0.18 : 0.35}
            minPixelRatio={performanceProfile.shaderMinPixelRatio}
            maxPixelCount={performanceProfile.shaderMaxPixelCount}
            className="liquid-metal-backdrop"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.58 }}
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>
      ) : (
        <div className="prisma-noir-backdrop pointer-events-none fixed inset-0 z-0" aria-hidden="true"><span>V</span></div>
      )}

      {/* Header with Navigation */}
      <Header
        currentView={appState === 'profile' ? 'profile' : isGrammarActive ? 'grammar' : 'test'}
        onNavigate={(view) => {
          testPreparationRunRef.current += 1;
          setIsQuestionLoading(false);
          if (view === 'profile') setAppState('profile');
          else if (view === 'grammar') setAppState('grammar_hub');
          else setAppState('setup');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        cloudUser={cloudUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={() => { cloudSyncService.signOut(); setCloudUser(null); }}
        cachedCount={cachedCount}
        vocabCount={vocabCount}
        currentTheme={currentTheme}
        isScrolled={isContentScrolled}
      />

      {/* Main Content Screens */}
      <main ref={scrollWrapperRef} onScroll={(event) => setIsContentScrolled(event.currentTarget.scrollTop > 6)} className="vocabmaster-scroll z-10 min-h-0 flex-1 overflow-y-auto">
        <div ref={scrollContentRef} className="vocabmaster-scroll-content flex min-h-full flex-col">
        {appState === 'setup' && (
          <SetupScreen
            initialText={sessionState.inputText}
            initialMode={sessionState.mode}
            initialNumOptions={sessionState.numOptions}
            initialSourceType={sessionState.sourceType}
            initialBankLevel={sessionState.bankLevel}
            initialBankWordCount={sessionState.bankWordCount}
            onStartCustomTest={startCustomTextTest}
            onStartVocabularyBankTest={startVocabularyBankTest}
            onNavigateToProfile={() => setAppState('profile')}
            onStateChange={handleSessionStateChange}
            onOpenSettings={() => setIsSettingsOpen(true)}
            currentTheme={currentTheme}
          />
        )}

        {appState === 'profile' && (
          <ProfileScreen
            key={cloudUser?.id || 'guest'}
            currentTheme={currentTheme}
            settings={settings}
            vocabularyRevision={vocabularyRevision}
            onStartVocabularyTest={(level) => {
              startVocabularyBankTest(level, 20, sessionState.mode, sessionState.numOptions);
            }}
            onVocabularyPrepared={() => {
              refreshCounts();
              setVocabularyRevision(revision => revision + 1);
            }}
          />
        )}

        {appState === 'grammar_hub' && (
          <GrammarHubScreen
            currentTheme={currentTheme}
            settings={settings}
            onSelectSubtopic={handleSelectSubtopic}
          />
        )}

        {appState === 'grammar_lecture' && currentGrammarLecture && (
          <GrammarLectureScreen
            currentTheme={currentTheme}
            lecture={currentGrammarLecture}
            onBackToHub={() => setAppState('grammar_hub')}
            onNavigateToLecture={handleSelectSubtopic}
            onStartExercises={() => setAppState('grammar_exercise')}
          />
        )}

        {appState === 'grammar_exercise' && currentGrammarLecture && (
          <GrammarExerciseScreen
            key={currentGrammarLecture.id}
            currentTheme={currentTheme}
            lecture={currentGrammarLecture}
            onBackToLecture={() => setAppState('grammar_lecture')}
            onBackToHub={() => setAppState('grammar_hub')}
          />
        )}

        {appState === 'preparing' && (
          <PreparationScreen
            progress={prepProgress}
            errors={prepErrors}
            currentTheme={currentTheme}
            onCancel={handleBackToSetup}
          />
        )}

        {appState === 'testing' && testQuestions.length > 0 && (
          <TestScreen
            key={testRunId}
            questions={testQuestions}
            settings={settings}
            currentTheme={currentTheme}
            onFinishTest={handleFinishTest}
            onExit={handleBackToSetup}
            isLoadingQuestions={isQuestionLoading}
            loadingProgress={prepProgress}
          />
        )}

        {appState === 'results' && (
          <ResultScreen
            results={testResults}
            currentTheme={currentTheme}
            sourceType={testSourceType}
            originalInputText={sessionState.inputText}
            currentWordsData={currentWordsData}
            onRestartAll={handleRestartAll}
            onRestartMistakesOnly={handleRestartMistakesOnly}
            onBackToSetup={handleBackToSetup}
          />
        )}
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onCacheUpdated={refreshCounts}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} theme={currentTheme} onAuthenticated={startCloudSession} />
    </div>
  );
}

export default App;
