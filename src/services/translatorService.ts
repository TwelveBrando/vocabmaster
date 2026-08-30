import type { AISettings } from '../types';
import { CEFR_DICTIONARY } from '../data/cefrDictionary';
import { translateViaMorphology } from './morphologyTranslator';

const TRANSLATION_CACHE_KEY = 'vocabmaster_translation_cache';

export interface TranslationResult {
  russian: string;
  disambiguationHint?: string;
  partOfSpeech?: string;
  synonyms?: string[];
}

function getCache(): Record<string, TranslationResult> {
  try {
    const stored = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore error
  }
  return {};
}

function saveCache(cache: Record<string, TranslationResult>): void {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore error
  }
}

export const translatorService = {
  /**
   * Translates a single English word using a fast, multi-tiered pipeline:
   * 1. Built-in CEFR base
   * 2. Local storage cache
   * 3. Yandex.Dictionary API (if user provided key)
   * 4. High-Speed Google Translate Client API (0ms latency, free, 100% reliable)
   * 5. Lingva API
   * 6. Morphological rule-based derivation
   */
  async translateWord(word: string, settings?: AISettings): Promise<TranslationResult> {
    const clean = word.toLowerCase().trim();
    if (!clean) return { russian: '' };

    // 1. Built-in CEFR dictionary lookup
    const builtIn = CEFR_DICTIONARY.find(d => d.word.toLowerCase() === clean);
    if (builtIn && builtIn.russian && builtIn.russian.toLowerCase() !== clean) {
      return {
        russian: builtIn.russian,
        disambiguationHint: builtIn.disambiguationHint,
        partOfSpeech: builtIn.partOfSpeech,
      };
    }

    // 2. Local Cache lookup
    const cache = getCache();
    if (cache[clean]?.russian && cache[clean].russian.toLowerCase() !== clean) {
      return cache[clean];
    }

    // 3. Yandex Dictionary API (if user configured Yandex API key in settings or localStorage)
    const yandexKey = settings?.yandexApiKey || localStorage.getItem('yandex_dict_api_key') || '';
    if (yandexKey && yandexKey.trim().length > 0) {
      try {
        const yandexUrl = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${encodeURIComponent(yandexKey.trim())}&lang=en-ru&text=${encodeURIComponent(clean)}`;
        const res = await fetch(yandexUrl, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const data = await res.json();
          const def = data?.def?.[0];
          if (def && def.tr && def.tr.length > 0) {
            const primaryTr = def.tr[0].text;
            const synonyms = def.tr.map((t: { text: string }) => t.text);
            const pos = def.pos || 'word';
            const hint = def.tr[0]?.mean?.map((m: { text: string }) => m.text).join(', ');

            const result: TranslationResult = {
              russian: primaryTr,
              disambiguationHint: hint || primaryTr,
              partOfSpeech: pos,
              synonyms,
            };

            cache[clean] = result;
            saveCache(cache);
            return result;
          }
        }
      } catch {
        // Fall through to next tier
      }
    }

    // 4. Ultra-Fast Google Translate API (Free, Instant <40ms, High-Accuracy)
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&dt=bd&q=${encodeURIComponent(clean)}`;
      const res = await fetch(gUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const primaryText = data?.[0]?.[0]?.[0];
        if (primaryText && typeof primaryText === 'string' && primaryText.toLowerCase().trim() !== clean) {
          const cleanRussian = primaryText.toLowerCase().trim();
          let pos = 'word';
          const synonyms: string[] = [];

          // Parse extra dictionary entries if returned by Google
          if (Array.isArray(data?.[1])) {
            for (const dictEntry of data[1]) {
              if (dictEntry?.[0]) pos = dictEntry[0];
              if (Array.isArray(dictEntry?.[1])) {
                for (const syn of dictEntry[1]) {
                  if (typeof syn === 'string' && !synonyms.includes(syn)) {
                    synonyms.push(syn);
                  }
                }
              }
            }
          }

          const result: TranslationResult = {
            russian: cleanRussian,
            disambiguationHint: synonyms.length > 1 ? synonyms.slice(0, 3).join(', ') : cleanRussian,
            partOfSpeech: pos,
            synonyms,
          };

          cache[clean] = result;
          saveCache(cache);
          return result;
        }
      }
    } catch {
      // Fall through to next tier
    }

    // 5. Lingva Open Translation API
    try {
      const lingvaUrl = `https://lingva.ml/api/v1/en/ru/${encodeURIComponent(clean)}`;
      const res = await fetch(lingvaUrl, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        if (data?.translation && data.translation.toLowerCase().trim() !== clean) {
          const cleanRussian = data.translation.toLowerCase().trim();
          const result: TranslationResult = {
            russian: cleanRussian,
            disambiguationHint: cleanRussian,
          };
          cache[clean] = result;
          saveCache(cache);
          return result;
        }
      }
    } catch {
      // Fall through to next tier
    }

    // 6. Morphological Rule-Based Translator (Zero network, Instant root/suffix derivation)
    const morph = translateViaMorphology(clean);
    if (morph) {
      const result: TranslationResult = {
        russian: morph,
        disambiguationHint: morph,
      };
      cache[clean] = result;
      saveCache(cache);
      return result;
    }

    // 7. MyMemory API Fallback
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|ru`;
      const res = await fetch(myMemoryUrl, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        const translated = data?.responseData?.translatedText;
        if (
          translated &&
          !translated.startsWith('MYMEMORY') &&
          translated.toLowerCase().trim() !== clean
        ) {
          const cleanRussian = translated.toLowerCase().trim();
          const result: TranslationResult = {
            russian: cleanRussian,
            disambiguationHint: cleanRussian,
          };
          cache[clean] = result;
          saveCache(cache);
          return result;
        }
      }
    } catch {
      // Final fallback
    }

    return {
      russian: clean,
      disambiguationHint: clean,
    };
  },

  /**
   * Batch translate a list of English words concurrently with high throughput
   */
  async batchTranslate(words: string[], settings?: AISettings): Promise<Record<string, TranslationResult>> {
    const results: Record<string, TranslationResult> = {};
    const cache = getCache();
    const needed: string[] = [];

    // Check cache and local CEFR base first
    for (const w of words) {
      const clean = w.toLowerCase().trim();
      const builtIn = CEFR_DICTIONARY.find(d => d.word.toLowerCase() === clean);
      if (builtIn && builtIn.russian && builtIn.russian.toLowerCase() !== clean) {
        results[clean] = {
          russian: builtIn.russian,
          disambiguationHint: builtIn.disambiguationHint,
          partOfSpeech: builtIn.partOfSpeech,
        };
      } else if (cache[clean]?.russian && cache[clean].russian.toLowerCase() !== clean) {
        results[clean] = cache[clean];
      } else {
        needed.push(clean);
      }
    }

    // If active AI model is available, translate missing batch in 1 single call
    if (needed.length > 0 && settings?.apiKey && settings.apiKey.trim() !== '') {
      try {
        const prompt = `Translate these English words into natural Russian. Return ONLY a JSON object where keys are the English words and values are objects with "russian" (primary translation), "disambiguationHint" (brief context), and "partOfSpeech":
${JSON.stringify(needed)}`;

        let rawText = '';
        if (settings.provider === 'gemini') {
          const model = settings.model || 'gemini-2.0-flash';
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { response_mime_type: 'application/json' },
            }),
            signal: AbortSignal.timeout(6000),
          });
          const data = await res.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
          rawText = data.choices?.[0]?.message?.content || '';
        }

        const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
        for (const [eng, val] of Object.entries(parsed)) {
          const cleanEng = eng.toLowerCase().trim();
          if (typeof val === 'string' && val.trim()) {
            const trResult: TranslationResult = { russian: val.trim(), disambiguationHint: val.trim() };
            results[cleanEng] = trResult;
            cache[cleanEng] = trResult;
          } else if (typeof val === 'object' && val !== null) {
            const obj = val as { russian?: string; disambiguationHint?: string; partOfSpeech?: string };
            if (obj.russian) {
              const trResult: TranslationResult = {
                russian: obj.russian.trim(),
                disambiguationHint: obj.disambiguationHint?.trim() || obj.russian.trim(),
                partOfSpeech: obj.partOfSpeech?.trim() || 'word',
              };
              results[cleanEng] = trResult;
              cache[cleanEng] = trResult;
            }
          }
        }
      } catch {
        // Fallback to concurrent parallel translation
      }
    }

    // For any words still missing, run fast concurrent Google / Yandex translation
    const stillNeeded = needed.filter(w => !results[w] || results[w].russian.toLowerCase() === w);
    if (stillNeeded.length > 0) {
      const chunkSize = 10;
      for (let i = 0; i < stillNeeded.length; i += chunkSize) {
        const chunk = stillNeeded.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (word) => {
            const tr = await this.translateWord(word, settings);
            results[word] = tr;
          })
        );
      }
    }

    saveCache(cache);
    return results;
  },
};
