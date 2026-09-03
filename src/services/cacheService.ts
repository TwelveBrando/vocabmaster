import type { CachedWordData } from '../types';

const CACHE_PREFIX = 'vocab_word_cache_v1_';

export const cacheService = {
  getWord(englishWord: string): CachedWordData | null {
    const key = CACHE_PREFIX + englishWord.trim().toLowerCase();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedWordData;
    } catch {
      return null;
    }
  },

  saveWord(data: CachedWordData): void {
    const key = CACHE_PREFIX + data.english.trim().toLowerCase();
    localStorage.setItem(key, JSON.stringify(data));
  },

  saveBatchWords(wordsData: CachedWordData[]): void {
    for (const item of wordsData) {
      this.saveWord(item);
    }
  },

  getMultiple(englishWords: string[]): { found: CachedWordData[]; missing: string[] } {
    const found: CachedWordData[] = [];
    const missing: string[] = [];

    for (const w of englishWords) {
      const normalized = w.trim();
      if (!normalized) continue;
      const cached = this.getWord(normalized);
      if (cached) {
        found.push(cached);
      } else {
        missing.push(normalized);
      }
    }

    return { found, missing };
  },

  getAllCachedWords(): CachedWordData[] {
    const results: CachedWordData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            results.push(JSON.parse(raw));
          } catch {
            // ignore malformed
          }
        }
      }
    }
    return results;
  },

  isAIContextReady(englishWord: string): boolean {
    const cached = this.getWord(englishWord);
    if (!cached || cached.contextSource !== 'ai' || !cached.contextVersion) return false;
    return Boolean(
      cached.disambiguationHint?.trim() &&
      cached.disambiguationHint.trim().toLowerCase() !== cached.russian.trim().toLowerCase()
    );
  },

  clearCache(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
};
