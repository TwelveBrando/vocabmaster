import type { DictionaryEntry, UserVocabularyItem, VocabularyStats, CEFRLevel, CachedWordData, AISettings } from '../types';
import { CEFR_DICTIONARY } from '../data/cefrDictionary';
import { getSmartFallbackDistractors } from './distractorPool';
import { generateAcceptableRussianVariants } from './wordParser';
import { dictionaryEngine } from './dictionaryEngine';
import { cloudSyncService } from './cloudSyncService';

const VOCABULARY_STORAGE_KEY = 'vocabmaster_user_vocabulary';
const CUSTOM_WORDS_STORAGE_KEY = 'vocabmaster_custom_dictionary_words';

export const vocabularyService = {
  getCustomWords(): DictionaryEntry[] {
    try {
      const stored = localStorage.getItem(CUSTOM_WORDS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore error
    }
    return [];
  },

  saveCustomWord(entry: DictionaryEntry): void {
    const custom = this.getCustomWords();
    const existingIdx = custom.findIndex(w => w.word.toLowerCase() === entry.word.toLowerCase());
    if (existingIdx >= 0) {
      custom[existingIdx] = entry;
    } else {
      custom.push(entry);
    }
    try {
      localStorage.setItem(CUSTOM_WORDS_STORAGE_KEY, JSON.stringify(custom));
    } catch {
      // Ignore error
    }
  },

  getAllDictionaryWords(): DictionaryEntry[] {
    const custom = this.getCustomWords();
    const map = new Map<string, DictionaryEntry>();

    for (const item of CEFR_DICTIONARY) {
      map.set(item.word.toLowerCase(), item);
    }

    for (const item of custom) {
      map.set(item.word.toLowerCase(), item);
    }

    return Array.from(map.values());
  },

  getDictionaryLevelCounts(): Record<CEFRLevel, number> {
    const counts: Record<CEFRLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    for (const entry of this.getAllDictionaryWords()) {
      counts[entry.level]++;
    }
    return counts;
  },

  getDictionaryWordsForLevel(level: CEFRLevel): DictionaryEntry[] {
    return this.getAllDictionaryWords().filter((entry) => entry.level === level);
  },

  /**
   * Universal search across local dictionary + 150,000+ full English words API with AI and morphological translation
   */
  async searchDictionaryUniversal(
    query: string,
    levelFilter: CEFRLevel | 'all' = 'all',
    settings?: AISettings
  ): Promise<DictionaryEntry[]> {
    const q = query.toLowerCase().trim();

    // 1. If empty query, return local base filtered by level
    if (!q) {
      const all = this.getAllDictionaryWords();
      if (levelFilter === 'all') return all;
      return all.filter(item => item.level === levelFilter);
    }

    // 2. Query Full English Dictionary Engine (Datamuse 150,000+ words API)
    try {
      const apiResults = await dictionaryEngine.searchFullEnglishDictionary(q, levelFilter, 40, settings);
      const map = new Map<string, DictionaryEntry>();

      // Put custom words first
      const localMatches = this.getAllDictionaryWords().filter(item => {
        if (levelFilter !== 'all' && item.level !== levelFilter) return false;
        return item.word.toLowerCase().includes(q) || item.russian.toLowerCase().includes(q);
      });

      for (const loc of localMatches) {
        map.set(loc.word.toLowerCase(), loc);
      }

      for (const apiItem of apiResults) {
        if (!map.has(apiItem.word.toLowerCase())) {
          map.set(apiItem.word.toLowerCase(), apiItem);
        }
      }

      return Array.from(map.values());
    } catch {
      // Offline fallback
      return this.getAllDictionaryWords().filter(item => {
        if (levelFilter !== 'all' && item.level !== levelFilter) return false;
        return item.word.toLowerCase().includes(q) || item.russian.toLowerCase().includes(q);
      });
    }
  },

  getUserVocabulary(): UserVocabularyItem[] {
    try {
      const stored = localStorage.getItem(VOCABULARY_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore error
    }
    return [];
  },

  saveUserVocabulary(items: UserVocabularyItem[], syncToCloud = true): void {
    try {
      localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(items));
      if (syncToCloud && cloudSyncService.isLoggedIn()) {
        void cloudSyncService.saveVocabulary(items).catch(() => {
          // The browser copy remains intact; the next vocabulary change retries sync.
        });
      }
    } catch {
      // Ignore error
    }
  },

  isWordInVocabulary(word: string): boolean {
    const vocab = this.getUserVocabulary();
    const norm = word.toLowerCase().trim();
    return vocab.some(item => item.word.toLowerCase() === norm);
  },

  async toggleWordInVocabulary(entry: DictionaryEntry): Promise<boolean> {
    const vocab = this.getUserVocabulary();
    const norm = entry.word.toLowerCase().trim();
    const existingIdx = vocab.findIndex(item => item.word.toLowerCase() === norm);

    if (existingIdx >= 0) {
      vocab.splice(existingIdx, 1);
      this.saveUserVocabulary(vocab);
      return false;
    } else {
      // Ensure translation is resolved
      let russian = entry.russian;
      if (!russian || russian.toLowerCase() === entry.word.toLowerCase()) {
        russian = await dictionaryEngine.translateWord(entry.word);
      }

      const newItem: UserVocabularyItem = {
        wordId: entry.id,
        word: entry.word,
        level: entry.level,
        partOfSpeech: entry.partOfSpeech,
        russian,
        disambiguationHint: entry.disambiguationHint,
        addedAt: Date.now(),
        testsCount: 0,
        correctCount: 0,
      };
      vocab.unshift(newItem);
      this.saveUserVocabulary(vocab);
      this.saveCustomWord({ ...entry, russian });
      return true;
    }
  },

  addBatchToVocabulary(entries: DictionaryEntry[]): void {
    const vocab = this.getUserVocabulary();
    const existingWords = new Set(vocab.map(v => v.word.toLowerCase().trim()));

    for (const entry of entries) {
      const norm = entry.word.toLowerCase().trim();
      if (!existingWords.has(norm)) {
        vocab.push({
          wordId: entry.id,
          word: entry.word,
          level: entry.level,
          partOfSpeech: entry.partOfSpeech,
          russian: entry.russian,
          disambiguationHint: entry.disambiguationHint,
          addedAt: Date.now(),
          testsCount: 0,
          correctCount: 0,
        });
        existingWords.add(norm);
      }
    }

    this.saveUserVocabulary(vocab);
  },

  clearVocabulary(): void {
    this.saveUserVocabulary([]);
  },

  getVocabularyStats(): VocabularyStats {
    const vocab = this.getUserVocabulary();
    const byLevel: Record<CEFRLevel, number> = {
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
      C1: 0,
      C2: 0,
    };

    let totalTests = 0;
    let totalCorrect = 0;

    for (const item of vocab) {
      if (item.level && byLevel[item.level] !== undefined) {
        byLevel[item.level]++;
      }
      totalTests += item.testsCount || 0;
      totalCorrect += item.correctCount || 0;
    }

    const accuracy = totalTests > 0 ? Math.round((totalCorrect / totalTests) * 100) : 0;

    return {
      totalWords: vocab.length,
      byLevel,
      totalTests,
      accuracy,
    };
  },

  getTestWordsFromVocabulary(level?: CEFRLevel | 'all', count?: number): CachedWordData[] {
    const vocab = this.getUserVocabulary();
    if (vocab.length === 0) return [];

    let filtered = vocab;
    if (level && level !== 'all') {
      filtered = vocab.filter(item => item.level === level);
    }

    if (filtered.length === 0) {
      filtered = vocab;
    }

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = count && count > 0 ? shuffled.slice(0, count) : shuffled;

    return selected.map(item => {
      const targetRussian = item.russian;
      return {
        english: item.word,
        russian: targetRussian,
        disambiguationHint: item.disambiguationHint || targetRussian,
        distractors: getSmartFallbackDistractors(targetRussian, 6, item.word),
        acceptableRussian: generateAcceptableRussianVariants(item.disambiguationHint || targetRussian, item.word),
        acceptableEnglish: [item.word.toLowerCase().trim()],
        contextSource: item.disambiguationHint && item.disambiguationHint !== targetRussian ? 'provided' : 'fallback',
        level: item.level,
        partOfSpeech: item.partOfSpeech,
        timestamp: Date.now(),
      };
    });
  },

  applyAIEnrichment(wordsData: CachedWordData[]): void {
    if (wordsData.length === 0) return;

    const enrichedByWord = new Map(wordsData.map(item => [item.english.toLowerCase().trim(), item]));
    const vocab = this.getUserVocabulary();
    let changed = false;

    for (const item of vocab) {
      const enriched = enrichedByWord.get(item.word.toLowerCase().trim());
      if (!enriched) continue;

      if (enriched.disambiguationHint && enriched.disambiguationHint !== item.disambiguationHint) {
        item.disambiguationHint = enriched.disambiguationHint;
        changed = true;
      }
      if (enriched.partOfSpeech && enriched.partOfSpeech !== item.partOfSpeech) {
        item.partOfSpeech = enriched.partOfSpeech;
        changed = true;
      }
    }

    if (changed) this.saveUserVocabulary(vocab);
  },

  recordTestResult(word: string, isCorrect: boolean): void {
    const vocab = this.getUserVocabulary();
    const norm = word.toLowerCase().trim();
    const item = vocab.find(v => v.word.toLowerCase() === norm);

    if (item) {
      item.testsCount = (item.testsCount || 0) + 1;
      if (isCorrect) {
        item.correctCount = (item.correctCount || 0) + 1;
      }
      item.lastTestedAt = Date.now();
      this.saveUserVocabulary(vocab);
    }
  },

  async lookupUnknownWordWithAI(word: string, settings: AISettings): Promise<DictionaryEntry> {
    const entry = await dictionaryEngine.deepLookupWithAI(word, settings);
    this.saveCustomWord(entry);
    return entry;
  },
};
