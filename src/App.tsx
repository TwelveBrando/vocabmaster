import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SetupScreen } from './components/SetupScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { PreparationScreen } from './components/PreparationScreen';
import { TestScreen } from './components/TestScreen';
import { ResultScreen } from './components/ResultScreen';
import { SettingsModal } from './components/SettingsModal';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { GrammarHubScreen } from './components/grammar/GrammarHubScreen';
import { GrammarLectureScreen } from './components/grammar/GrammarLectureScreen';
import { AuthModal } from './components/AuthModal';
import type { TestMode, AISettings, TestQuestion, QuestionResult, CachedWordData, CEFRLevel } from './types';
import type { GrammarLecture } from './types/grammar';
import { grammarService } from './services/grammarService';
import { settingsService } from './services/settingsService';
import { cacheService } from './services/cacheService';
import { vocabularyService } from './services/vocabularyService';
import { AIService } from './services/aiService';
import { buildTestQuestions } from './services/testBuilder';
import { parseVocabularyInput } from './services/wordParser';
import { THEMES } from './styles/themes';
import { cloudSyncService, type CloudUser } from './services/cloudSyncService';

import type { SessionState } from './services/settingsService';

export function App() {
  const [appState, setAppState] = useState<
    'setup' | 'profile' | 'preparing' | 'testing' | 'results' | 'grammar_hub' | 'grammar_lecture'
  >('setup');
  const [settings, setSettings] = useState<AISettings>(() => settingsService.getSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [vocabCount, setVocabCount] = useState(0);
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Grammar Module State
  const [currentGrammarLecture, setCurrentGrammarLecture] = useState<GrammarLecture | null>(null);

  // Persistent Session state
  const [sessionState, setSessionState] = useState<SessionState>(() => settingsService.getSessionState());

  // Preparation state
  const [prepProgress, setPrepProgress] = useState({ processed: 0, total: 0, message: '' });
  const [prepErrors, setPrepErrors] = useState<string[]>([]);

  // Test state
  const [testSourceType, setTestSourceType] = useState<'vocab_bank' | 'custom_input'>('custom_input');
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [testResults, setTestResults] = useState<QuestionResult[]>([]);
  const [currentWordsData, setCurrentWordsData] = useState<CachedWordData[]>([]);

  const currentTheme = settings.theme || 'cyber_oasis';
  const currentThemeConfig = THEMES[currentTheme] || THEMES.cyber_oasis;

  const refreshCounts = useCallback(() => {
    setCachedCount(cacheService.getAllCachedWords().length);
    setVocabCount(vocabularyService.getUserVocabulary().length);
  }, []);

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
      setCloudUser(user);
      const remote = await cloudSyncService.loadVocabulary();
      const local = vocabularyService.getUserVocabulary();
      const byWord = new Map([...remote, ...local].map(item => [item.word.toLowerCase(), item]));
      vocabularyService.saveUserVocabulary([...byWord.values()]);
      await cloudSyncService.saveVocabulary(vocabularyService.getUserVocabulary());
      refreshCounts();
    }).catch(() => {});
  }, [refreshCounts]);

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
      const dataWithSmartDistractors: CachedWordData[] = parsed.isFormattedWithTranslations
        ? parsed.wordsData
        : inputItems.map(item => {
            const eng = typeof item === 'string' ? item : item.english;
            const cached = cacheService.getWord(eng);
            if (cached) return cached;
            return {
              english: eng,
              russian: eng,
              disambiguationHint: eng,
              distractors: ['вариант 1', 'вариант 2', 'вариант 3', 'вариант 4', 'вариант 5', 'вариант 6'],
              acceptableRussian: [eng],
              acceptableEnglish: [eng.toLowerCase()],
              timestamp: Date.now(),
            };
          });

      cacheService.saveBatchWords(dataWithSmartDistractors);
      refreshCounts();
      setCurrentWordsData(dataWithSmartDistractors);

      const questions = buildTestQuestions(dataWithSmartDistractors, mode, numOptions);
      setTestQuestions(questions);
      setAppState('testing');
      return;
    }

    setAppState('preparing');
    setPrepErrors([]);
    setPrepProgress({ processed: 0, total: inputItems.length, message: 'ИИ подбирает варианты ответов...' });

    try {
      const { data, errors } = await AIService.fetchWordsData(
        inputItems,
        settings,
        (processed, total, message) => {
          setPrepProgress({ processed, total, message });
        }
      );

      refreshCounts();
      setCurrentWordsData(data);

      if (errors.length > 0) {
        setPrepErrors(errors);
      }

      const questions = buildTestQuestions(data, mode, numOptions);
      setTestQuestions(questions);

      setTimeout(() => {
        setAppState('testing');
      }, 300);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setPrepErrors([`Не удалось подготовить слова: ${errorMsg}`]);
    }
  };

  // START TEST DIRECTLY FROM PERSONAL VOCABULARY BANK
  const startVocabularyBankTest = (
    level: CEFRLevel | 'all' = sessionState.bankLevel || 'all',
    count: number = sessionState.bankWordCount || 15,
    mode: TestMode = sessionState.mode,
    numOptions: number = sessionState.numOptions
  ) => {
    handleSessionStateChange({ bankLevel: level, bankWordCount: count, mode, numOptions, sourceType: 'vocab_bank' });
    const words = vocabularyService.getTestWordsFromVocabulary(level, count);
    if (words.length === 0) return;

    setTestSourceType('vocab_bank');
    setCurrentWordsData(words);
    const questions = buildTestQuestions(words, mode, numOptions);
    setTestQuestions(questions);
    setAppState('testing');
  };

  const handleFinishTest = (results: QuestionResult[]) => {
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
      const questions = buildTestQuestions(mistakeItems, sessionState.mode, sessionState.numOptions);
      setTestQuestions(questions);
      setAppState('testing');
    }
  };

  const handleBackToSetup = () => {
    setAppState('setup');
  };

  const handleSelectSubtopic = (subtopicId: string) => {
    const lecture = grammarService.getLectureBySubtopicId(subtopicId);
    if (lecture) {
      setCurrentGrammarLecture(lecture);
      setAppState('grammar_lecture');
    }
  };

  const isGrammarActive = appState === 'grammar_hub' || appState === 'grammar_lecture';

  return (
    <div className={`h-screen ${currentThemeConfig.pageBg} flex flex-col font-sans relative overflow-hidden transition-colors duration-500`}>
      {/* Dynamic 60fps Ambient Canvas */}
      <BackgroundCanvas theme={currentTheme} />

      {/* Header with Navigation */}
      <Header
        currentView={appState === 'profile' ? 'profile' : isGrammarActive ? 'grammar' : 'test'}
        onNavigate={(view) => {
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
      />

      {/* Main Content Screens */}
      <main className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
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
            currentTheme={currentTheme}
            settings={settings}
            onStartVocabularyTest={(level) => {
              startVocabularyBankTest(level, 20, sessionState.mode, sessionState.numOptions);
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
            questions={testQuestions}
            settings={settings}
            currentTheme={currentTheme}
            onFinishTest={handleFinishTest}
            onExit={handleBackToSetup}
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
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onCacheUpdated={refreshCounts}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} theme={currentTheme} onAuthenticated={async (user) => {
        setCloudUser(user); await cloudSyncService.saveVocabulary(vocabularyService.getUserVocabulary());
      }} />
    </div>
  );
}

export default App;
