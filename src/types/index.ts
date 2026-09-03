export type TestMode = 'mode1_choice' | 'mode2_ru_to_en' | 'mode3_en_to_ru';

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'custom';

export type UITheme =
  | 'language_explorer'
  | 'neon_brush'
  | 'quantum_matrix'
  | 'cosmic_nebula'
  | 'cyber_vortex'
  | 'aurora_borealis'
  | 'retro_synthwave'
  | 'sakura_petals'
  | 'golden_ember'
  | 'cyber_oasis'
  | 'frosted_glass'
  | 'bento_luxury'
  | 'nordic_paper'
  | 'sakura_sunset'
  | 'emerald_synth'
  | 'prisma_noir';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  apiKeys?: Partial<Record<AIProvider, string>>;
  yandexApiKey?: string;
  model: string;
  baseUrl?: string;
  theme: UITheme;
  soundEnabled: boolean;
  autoAdvanceCorrect: boolean;
  autoAdvanceDelayMs: number;
}

export interface CachedWordData {
  english: string;
  russian: string;
  disambiguationHint: string;
  distractors: string[];
  acceptableRussian?: string[];
  acceptableEnglish?: string[];
  contextSource?: 'ai' | 'provided' | 'fallback';
  contextVersion?: number;
  level?: CEFRLevel;
  partOfSpeech?: string;
  timestamp: number;
}

export interface DictionaryEntry {
  id: string;
  word: string;
  level: CEFRLevel;
  partOfSpeech: string;
  russian: string;
  disambiguationHint?: string;
  example?: string;
  isCustom?: boolean;
}

export interface UserVocabularyItem {
  wordId: string;
  word: string;
  level: CEFRLevel;
  partOfSpeech: string;
  russian: string;
  disambiguationHint?: string;
  addedAt: number;
  testsCount: number;
  correctCount: number;
  lastTestedAt?: number;
}

export interface VocabularyStats {
  totalWords: number;
  byLevel: Record<CEFRLevel, number>;
  totalTests: number;
  accuracy: number;
}

export interface TestQuestion {
  id: string;
  originalWord: string;
  russianWord: string;
  disambiguationHint: string;
  mode: TestMode;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers: string[];
  level?: CEFRLevel;
}

export interface QuestionResult {
  question: TestQuestion;
  userAnswer: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface TestSessionStats {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  results: QuestionResult[];
}
