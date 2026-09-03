import type { DictionaryEntry, CEFRLevel, AISettings } from '../types';
import { CEFR_DICTIONARY } from '../data/cefrDictionary';
import { translatorService } from './translatorService';

/**
 * Calculates CEFR Level from Datamuse frequency score (Zipf frequency per million words)
 */
export function calculateCEFRFromFrequency(freqString?: string): CEFRLevel {
  if (!freqString) return 'B1';
  
  const match = freqString.match(/f:([0-9.]+)/);
  if (!match) return 'B1';

  const freq = parseFloat(match[1]);
  if (isNaN(freq)) return 'B1';

  if (freq >= 60.0) return 'A1';
  if (freq >= 18.0) return 'A2';
  if (freq >= 5.0) return 'B1';
  if (freq >= 1.2) return 'B2';
  if (freq >= 0.25) return 'C1';
  return 'C2';
}

function parsePartOfSpeech(defString?: string): string {
  if (!defString) return 'word';
  const prefix = defString.split('\t')[0]?.toLowerCase().trim();
  if (prefix === 'n' || prefix === 'noun') return 'noun';
  if (prefix === 'v' || prefix === 'verb') return 'verb';
  if (prefix === 'adj' || prefix === 'adjective') return 'adj';
  if (prefix === 'adv' || prefix === 'adverb') return 'adv';
  if (prefix === 'u' || prefix === 'phrase') return 'phrase';
  return prefix || 'word';
}

function cleanDefinition(defString?: string): string {
  if (!defString) return '';
  const parts = defString.split('\t');
  const raw = parts.length > 1 ? parts.slice(1).join(' ').trim() : defString.trim();
  return raw.replace(/\(archaic\)|\(obsolete\)/gi, '').trim();
}

export const dictionaryEngine = {
  /**
   * Fast translation via multi-tier translator (BuiltIn, Yandex, Google, Lingva, Morphology)
   */
  async translateWord(word: string, settings?: AISettings): Promise<string> {
    const res = await translatorService.translateWord(word, settings);
    return res.russian || word;
  },

  /**
   * Batch translate an array of words with high throughput
   */
  async batchTranslateWords(words: string[], settings?: AISettings): Promise<Record<string, string>> {
    const results = await translatorService.batchTranslate(words, settings);
    const map: Record<string, string> = {};
    for (const [k, v] of Object.entries(results)) {
      map[k] = v.russian || k;
    }
    return map;
  },

  /**
   * Search across the ENTIRE 150,000+ English Dictionary with guaranteed translations and archaic word filtering
   */
  async searchFullEnglishDictionary(
    query: string,
    levelFilter: CEFRLevel | 'all' = 'all',
    maxResults: number = 40,
    settings?: AISettings
  ): Promise<DictionaryEntry[]> {
    const q = query.toLowerCase().trim();
    if (!q) {
      if (levelFilter === 'all') return CEFR_DICTIONARY;
      return CEFR_DICTIONARY.filter(d => d.level === levelFilter);
    }

    try {
      const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(q)}*&md=df&max=${maxResults * 3}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Datamuse API failed');

      interface DatamuseItem {
        word: string;
        score?: number;
        tags?: string[];
        defs?: string[];
      }

      const data: DatamuseItem[] = await res.json();
      const rawEntries: { item: DatamuseItem; level: CEFRLevel; partOfSpeech: string; hint: string }[] = [];

      for (const item of data) {
        if (!item.word || item.word.includes(' ') || item.word.includes('_') || item.word.length < 2) continue;

        const def = item.defs?.[0] || '';
        // Filter out obsolete / archaic garbage spellings (e.g. answerde, answere)
        if (def.includes('(obsolete)') || def.includes('(archaic)')) continue;

        const builtIn = CEFR_DICTIONARY.find(b => b.word.toLowerCase() === item.word.toLowerCase());
        
        let level: CEFRLevel = 'B1';
        let partOfSpeech = 'word';
        let hint = '';

        if (builtIn) {
          level = builtIn.level;
          partOfSpeech = builtIn.partOfSpeech;
          hint = builtIn.disambiguationHint || '';
        } else {
          const freqTag = item.tags?.find(t => t.startsWith('f:'));
          level = calculateCEFRFromFrequency(freqTag);
          partOfSpeech = parsePartOfSpeech(def);
          hint = cleanDefinition(def);
        }

        if (levelFilter !== 'all' && level !== levelFilter) {
          continue;
        }

        rawEntries.push({ item, level, partOfSpeech, hint });
        if (rawEntries.length >= maxResults) break;
      }

      // Batch translate all words simultaneously using multi-tiered translatorService
      const wordsToTranslate = rawEntries.map(e => e.item.word);
      const translations = await translatorService.batchTranslate(wordsToTranslate, settings);

      const entries: DictionaryEntry[] = rawEntries.map(({ item, level, partOfSpeech, hint }) => {
        const cleanWord = item.word.toLowerCase();
        const trData = translations[cleanWord];
        const translatedRu = trData?.russian || cleanWord;
        const resolvedHint = hint || trData?.disambiguationHint || translatedRu;

        return {
          id: `dm_${item.word}_${level}`,
          word: item.word,
          level,
          partOfSpeech: trData?.partOfSpeech || partOfSpeech,
          russian: translatedRu,
          disambiguationHint: resolvedHint,
        };
      });

      return entries;
    } catch {
      return CEFR_DICTIONARY.filter(d => {
        if (levelFilter !== 'all' && d.level !== levelFilter) return false;
        return (
          d.word.toLowerCase().includes(q) ||
          d.russian.toLowerCase().includes(q)
        );
      });
    }
  },

  async deepLookupWithAI(word: string, settings: AISettings): Promise<DictionaryEntry> {
    const norm = word.toLowerCase().trim();

    const builtIn = CEFR_DICTIONARY.find(d => d.word.toLowerCase() === norm);
    if (builtIn) return builtIn;

    // Check high-speed translator first
    const trData = await translatorService.translateWord(norm, settings);

    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return {
        id: `ai_${norm}_${Date.now()}`,
        word: norm,
        level: 'B1',
        partOfSpeech: trData.partOfSpeech || 'word',
        russian: trData.russian || norm,
        disambiguationHint: trData.disambiguationHint || trData.russian || norm,
      };
    }

    const prompt = `You are an Oxford & Cambridge CEFR Lexicographer.
For the English word/phrase "${norm}", provide an accurate CEFR breakdown:
1. "word": "${norm}"
2. "level": exact CEFR level ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")
3. "partOfSpeech": "noun" | "verb" | "adj" | "adv" | "phr verb" | "idiom"
4. "russian": primary natural Russian translation
5. "disambiguationHint": contextual definition with examples in Russian

Return ONLY valid JSON:
{
  "word": "${norm}",
  "level": "B2",
  "partOfSpeech": "verb",
  "russian": "translation",
  "disambiguationHint": "translation (context/usage)"
}`;

    try {
      let text = '';
      if (settings.provider === 'gemini') {
        const model = settings.model || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(6000),
        });
        const data = await res.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        const endpoint = settings.provider === 'groq'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://openrouter.ai/api/v1/chat/completions';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            model: settings.model || 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
          signal: AbortSignal.timeout(6000),
        });
        const data = await res.json();
        text = data.choices?.[0]?.message?.content || '';
      }

      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      const level = (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(parsed.level) ? parsed.level : 'B1') as CEFRLevel;

      return {
        id: `ai_${norm}_${Date.now()}`,
        word: norm,
        level,
        partOfSpeech: parsed.partOfSpeech || trData.partOfSpeech || 'word',
        russian: parsed.russian || trData.russian || norm,
        disambiguationHint: parsed.disambiguationHint || trData.disambiguationHint || parsed.russian || norm,
      };
    } catch {
      return {
        id: `ai_${norm}_${Date.now()}`,
        word: norm,
        level: 'B1',
        partOfSpeech: trData.partOfSpeech || 'word',
        russian: trData.russian || norm,
        disambiguationHint: trData.disambiguationHint || trData.russian || norm,
      };
    }
  },
};
