import type { AISettings, CachedWordData } from '../types';
import { cacheService } from './cacheService';
import { KNOWN_RUSSIAN_SYNONYMS, expandRussianGrammarVariants } from './synonymHelper';
import { generateAcceptableRussianVariants } from './wordParser';
import { getSmartFallbackDistractors } from './distractorPool';

const AI_CONTEXT_VERSION = 1;
const GEMINI_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const wait = (delayMs: number): Promise<void> => new Promise(resolve => setTimeout(resolve, delayMs));

const readGeminiError = async (response: Response): Promise<string> => {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.error?.message || parsed?.message || raw || response.statusText);
  } catch {
    return raw || response.statusText || `HTTP ${response.status}`;
  }
};

const isCredentialError = (status: number, message: string): boolean =>
  status === 401 ||
  status === 403 ||
  (status === 400 && /api.?key|credential|permission|unauth/i.test(message));

interface AIWordRequest {
  english: string;
  userRussian?: string;
  userContext?: string;
}

const normalizeContextPart = (value?: string): string => (value || '')
  .toLowerCase()
  .replace(/[ё]/g, 'е')
  .replace(/[^a-zа-я0-9]+/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Old cache/import entries often contain only the translation in this field. */
export function hasUsefulDisambiguationContext(item: Pick<CachedWordData, 'russian' | 'disambiguationHint'>): boolean {
  const russian = normalizeContextPart(item.russian);
  const hint = normalizeContextPart(item.disambiguationHint);
  if (!hint || hint === russian) return false;

  const extraWords = hint.split(' ').filter(word => word && !russian.split(' ').includes(word));
  return extraWords.length > 0;
}

export class AIService {
  private static buildPrompt(words: AIWordRequest[]): string {
    return `You are a professional lexicographer and vocabulary testing engine for an English-Russian vocabulary trainer app.
Analyze the following English words/phrases${words.some(w => w.userRussian) ? ' and their provided user translations' : ''}:
${JSON.stringify(words, null, 2)}

For EVERY word in the list, return a JSON object with:
1. "english": the exact English word/phrase.
2. "russian": the primary natural Russian translation (keep user's translation if provided).
3. "disambiguationHint": A clear, disambiguating contextual mini-description in Russian so the user can identify the EXACT English target from the Russian prompt.
   THIS FIELD IS REQUIRED FOR EVERY ITEM. It MUST add usage/situation/object/contrast information and MUST NOT be merely the Russian translation repeated.
   If a user translation is provided, preserve it in "russian", but independently create or improve the contextual hint. Use "userContext" only as useful guidance; do not simply copy it.
   Explicitly distinguish close English words when ambiguity is likely. For example, "stairs" must be distinguished from "ladder": "лестница (ступени между этажами; не переносная лестница ladder)".
   Format examples:
   - "поднимать (руку/цену)"
   - "через (сквозь: например, сквозь стену/лес)"
   - "рецепт (медицинский: назначение врача на лекарство)"
   - "надевать (одежду/обувь/очки)"
   - "воспитывать (детей) или поднимать (вопрос в беседе)"
4. "distractors": An array of 6 high-quality, clever, and plausible Russian distractor translations for multiple choice questions.
   CRITICAL DISTRACTOR RULES:
   - Distractors MUST match the exact same grammatical part of speech and syntactic form as the target word (verbs for verbs, nouns for nouns, adverbs for adverbs, adjectives for adjectives).
   - Distractors SHOULD be semantically related, near-synonyms, contextual associates, or false friends that an English learner might confuse with this word.
   - Distractors MUST NOT be correct translations for this word.
   - Distractors MUST NEVER be copied from other words in this user list. They must be newly generated and specifically tailored for testing this word.
5. "acceptableRussian": A COMPREHENSIVE array of ALL true, accurate, and interchangeable Russian synonyms and grammatical variants (e.g. for verbs include both perfective & imperfective aspects: ["извиняться", "извиниться", "просить прощения", "попросить прощения"]; for adverbs/prepositions include valid forms: ["за границей", "за рубежом", "за границу", "за рубеж"]; for nouns include direct synonyms: ["подросток", "тинейджер"]).
6. "acceptableEnglish": An array containing the exact target and spelling variants of that SAME lexical item only (e.g. ["apologize", "apologise"]). NEVER include semantic synonyms or nearby words. For "stairs", "ladder" and "steps" are not acceptable answers.

Return ONLY a valid JSON object with the following schema:
{
  "items": [
    {
      "english": "word",
      "russian": "primary translation",
      "disambiguationHint": "primary translation (context)",
      "distractors": ["distractor1", "distractor2", "distractor3", "distractor4", "distractor5", "distractor6"],
      "acceptableRussian": ["synonym1", "synonym2", "synonym3", "synonym4"],
      "acceptableEnglish": ["word1", "word2"]
    }
  ]
}`;
  }

  private static parseJsonResponse(rawText: string): CachedWordData[] {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(clean);
    const items = parsed.items || (Array.isArray(parsed) ? parsed : []);
    const results: CachedWordData[] = [];

    for (const item of items) {
      if (!item.english || !item.russian) continue;

      const baseRussian = item.russian.trim();
      const englishWord = item.english.trim();

      // Combine AI synonyms with grammar variants and known synonyms
      const mergedAcceptable = new Set<string>();
      
      if (Array.isArray(item.acceptableRussian)) {
        item.acceptableRussian.forEach((r: string) => {
          mergedAcceptable.add(r.trim());
          expandRussianGrammarVariants(r.trim()).forEach(gv => mergedAcceptable.add(gv));
        });
      }
      mergedAcceptable.add(baseRussian);
      generateAcceptableRussianVariants(baseRussian, englishWord).forEach(v => mergedAcceptable.add(v));

      // Ensure at least 6 valid distractors
      let distractors: string[] = [];
      if (Array.isArray(item.distractors) && item.distractors.length >= 2) {
        distractors = item.distractors.map((d: string) => d.trim()).filter((d: string) => d !== baseRussian);
      }
      if (distractors.length < 6) {
        const fallbacks = getSmartFallbackDistractors(baseRussian, 6);
        for (const fb of fallbacks) {
          if (!distractors.includes(fb) && fb !== baseRussian) {
            distractors.push(fb);
          }
        }
      }

      results.push({
        english: englishWord,
        russian: baseRussian,
        disambiguationHint: typeof item.disambiguationHint === 'string'
          ? item.disambiguationHint.trim() || baseRussian
          : baseRussian,
        distractors: distractors.slice(0, 6),
        acceptableRussian: Array.from(mergedAcceptable).filter(Boolean),
        // A Russian-to-English test checks recall of the selected vocabulary item,
        // not any broadly synonymous word (stairs !== ladder).
        acceptableEnglish: [englishWord.toLowerCase()],
        contextSource: 'ai',
        contextVersion: AI_CONTEXT_VERSION,
        timestamp: Date.now(),
      });
    }

    return results;
  }

  private static async queryGemini(
    words: AIWordRequest[],
    settings: AISettings
  ): Promise<CachedWordData[]> {
    const apiKey = settings.apiKey;
    const prompt = this.buildPrompt(words);
    const apiHeaders = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    };

    let candidateModels: string[] = [];
    let modelListAvailable = false;

    try {
      const listRes = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models',
        { headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(6000) }
      );
      if (listRes.ok) {
        modelListAvailable = true;
        const listData = await listRes.json();
        if (Array.isArray(listData.models)) {
          const supportedNames: string[] = listData.models
            .filter((m: { name?: string; supportedGenerationMethods?: string[] }) =>
              m.name && Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
            )
            .map((m: { name: string }) => m.name.replace(/^models\//, ''))
            .filter((name: string) => {
              const lower = name.toLowerCase();
              return !lower.includes('tts') && !lower.includes('audio') && !lower.includes('embedding') && !lower.includes('imagen') && !lower.includes('bison');
            });

          const priorityOrder = [
            settings.model,
            'gemini-3.5-flash-lite',
            'gemini-3.5-flash',
            'gemini-3.7-flash',
            'gemini-3.6-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
          ].filter((name): name is string => Boolean(name));

          candidateModels = [
            ...priorityOrder.filter((name, index) => priorityOrder.indexOf(name) === index && supportedNames.includes(name)),
            ...supportedNames.filter(s => !priorityOrder.includes(s)),
          ];
        }
      } else {
        const errorMessage = await readGeminiError(listRes);
        if (isCredentialError(listRes.status, errorMessage)) {
          throw new Error('Ключ Gemini отклонён. Создайте новый API-ключ в Google AI Studio и сохраните его в настройках.');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Ключ Gemini')) throw error;
      // A temporary failure of the model-list endpoint should not block generation.
    }

    if (candidateModels.length === 0) {
      candidateModels = Array.from(new Set([
        settings.model,
        'gemini-3.5-flash-lite',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-flash-latest',
      ].filter((name): name is string => Boolean(name))));
    }

    const modelsToTry = candidateModels.slice(0, 5);
    let lastError = '';

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: apiHeaders,
            signal: AbortSignal.timeout(16000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
              },
            }),
          });

          if (!res.ok) {
            const errorMessage = await readGeminiError(res);
            if (isCredentialError(res.status, errorMessage)) {
              throw new Error('Ключ Gemini отклонён. Проверьте API-ключ в настройках.');
            }

            lastError = `${model}: HTTP ${res.status} — ${errorMessage}`;
            if (GEMINI_RETRYABLE_STATUSES.has(res.status) && attempt === 0) {
              await wait(900);
              continue;
            }
            break;
          }

          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            lastError = `${model}: Gemini вернул пустой ответ.`;
            break;
          }

          return this.parseJsonResponse(text);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.startsWith('Ключ Gemini')) throw error;
          lastError = `${model}: ${message}`;
          if (attempt === 0) {
            await wait(900);
            continue;
          }
          break;
        }
      }
    }

    const prefix = modelListAvailable
      ? 'Доступные Gemini-модели временно не отвечают.'
      : 'Не удалось получить список Gemini-моделей.';
    throw new Error(`${prefix} ${lastError || 'Повторите позже.'}`);
  }

  private static async queryGroqOrOpenAI(
    words: AIWordRequest[],
    settings: AISettings,
    endpoint: string,
    defaultModel: string
  ): Promise<CachedWordData[]> {
    const model = settings.model || defaultModel;
    const apiKey = settings.apiKey;
    const prompt = this.buildPrompt(words);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Пустой ответ от AI модели');

    return this.parseJsonResponse(text);
  }

  static async fetchWordsData(
    wordsInput: (string | CachedWordData)[],
    settings: AISettings,
    onProgress?: (processed: number, total: number, message: string) => void
  ): Promise<{ data: CachedWordData[]; errors: string[] }> {
    const normalizedInput = wordsInput.map(item => {
      if (typeof item === 'string') {
        return { english: item.trim(), userRussian: undefined, userContext: undefined, initialData: undefined };
      }
      return {
        english: item.english.trim(),
        userRussian: item.russian,
        userContext: hasUsefulDisambiguationContext(item) ? item.disambiguationHint : undefined,
        initialData: item,
      };
    }).filter(w => w.english.length > 0);

    const total = normalizedInput.length;
    const results: CachedWordData[] = [];
    const errors: string[] = [];

    // 1. Check local cache
    const missing: (AIWordRequest & { initialData?: CachedWordData })[] = [];

    for (const item of normalizedInput) {
      const cached = cacheService.getWord(item.english);
      // If cached and has full acceptableRussian array and at least 4 distractors, reuse it
      if (
        cached &&
        Array.isArray(cached.acceptableRussian) &&
        cached.acceptableRussian.length > 0 &&
        Array.isArray(cached.distractors) &&
        cached.distractors.length >= 4 &&
        hasUsefulDisambiguationContext(cached) &&
        cached.contextSource === 'ai' &&
        cached.contextVersion === AI_CONTEXT_VERSION &&
        (!item.userRussian || normalizeContextPart(item.userRussian) === normalizeContextPart(cached.russian))
      ) {
        results.push(cached);
      } else if (item.initialData && (!settings.apiKey || settings.apiKey.trim() === '')) {
        // If no API key, enrich with smart fallback distractors
        const targetRussian = item.initialData.russian || item.initialData.disambiguationHint;
        item.initialData.distractors = getSmartFallbackDistractors(targetRussian, 6);
        const expanded = generateAcceptableRussianVariants(item.initialData.disambiguationHint || item.initialData.russian, item.english);
        item.initialData.acceptableRussian = Array.from(new Set([...(item.initialData.acceptableRussian || []), ...expanded]));
        cacheService.saveWord(item.initialData);
        results.push(item.initialData);
      } else {
        missing.push(item);
      }
    }

    if (onProgress) {
      onProgress(results.length, total, `Загружено из кэша: ${results.length}/${total}`);
    }

    if (missing.length === 0) {
      return { data: results, errors };
    }

    // 2. If no API key is provided, use smart fallback distractor pool for missing words
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      if (missing.some(m => !m.initialData)) {
        errors.push('API-ключ не указан в настройках (⚙️). Варианты ответов сгенерированы по грамматическим категориям. Укажите ключ Gemini/Groq для генерации уникальных вариантов ИИ.');
      }

      for (const m of missing) {
        if (m.initialData) {
          const targetRussian = m.initialData.russian || m.initialData.disambiguationHint;
          m.initialData.distractors = getSmartFallbackDistractors(targetRussian, 6);
          const expanded = generateAcceptableRussianVariants(m.initialData.disambiguationHint || m.initialData.russian, m.english);
          m.initialData.acceptableRussian = Array.from(new Set([...(m.initialData.acceptableRussian || []), ...expanded]));
          cacheService.saveWord(m.initialData);
          results.push(m.initialData);
        } else {
          const known = KNOWN_RUSSIAN_SYNONYMS[m.english.toLowerCase()] || [];
          const primaryRussian = known[0] || m.english;
          const fbDistractors = getSmartFallbackDistractors(primaryRussian, 6);
          const fbItem: CachedWordData = {
            english: m.english,
            russian: primaryRussian,
            disambiguationHint: primaryRussian,
            distractors: fbDistractors,
            acceptableRussian: known.length > 0 ? known : [m.english],
            acceptableEnglish: [m.english.toLowerCase()],
            timestamp: Date.now(),
          };
          cacheService.saveWord(fbItem);
          results.push(fbItem);
        }
      }
      return { data: results, errors };
    }

    // 3. Query AI in batches for all missing words to get complete synonyms & clever distractors
    const BATCH_SIZE = 15;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      if (onProgress) {
        onProgress(
          results.length,
          total,
          `ИИ генерирует варианты и синонимы (${results.length}/${total})...`
        );
      }

      try {
        let batchResults: CachedWordData[] = [];
        if (settings.provider === 'gemini') {
          batchResults = await this.queryGemini(batch, settings);
        } else if (settings.provider === 'groq') {
          batchResults = await this.queryGroqOrOpenAI(
            batch,
            settings,
            'https://api.groq.com/openai/v1/chat/completions',
            'openai/gpt-oss-120b'
          );
        } else if (settings.provider === 'openrouter') {
          batchResults = await this.queryGroqOrOpenAI(
            batch,
            settings,
            'https://openrouter.ai/api/v1/chat/completions',
            settings.model || 'nvidia/nemotron-3.5-lightning:free'
          );
        } else if (settings.provider === 'custom' && settings.baseUrl) {
          batchResults = await this.queryGroqOrOpenAI(
            batch,
            settings,
            `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`,
            settings.model || 'gpt-3.5-turbo'
          );
        }

        // Merge user custom translations if provided
        for (const res of batchResults) {
          const original = batch.find(b => b.english.toLowerCase() === res.english.toLowerCase());
          if (original?.userRussian) {
            res.russian = original.userRussian;
            // Add user's custom words to acceptable synonyms
            const userVariants = generateAcceptableRussianVariants(original.userRussian, res.english);
            res.acceptableRussian = Array.from(new Set([...(res.acceptableRussian || []), ...userVariants]));
          }
          res.acceptableEnglish = [res.english.toLowerCase().trim()];

          // A malformed model response should not erase a useful context supplied
          // by the user, but it must never replace generated context with a bare translation.
          if (!hasUsefulDisambiguationContext(res) && original?.userContext) {
            res.disambiguationHint = original.userContext;
            res.contextSource = 'provided';
            res.contextVersion = undefined;
          }
        }

        cacheService.saveBatchWords(batchResults);
        results.push(...batchResults);

        // Fill any words the model missed
        const returnedSet = new Set(batchResults.map(b => b.english.toLowerCase()));
        for (const item of batch) {
          if (!returnedSet.has(item.english.toLowerCase())) {
            const targetRussian = item.userRussian || item.english;
            const fallbackItem: CachedWordData = item.initialData || {
              english: item.english,
              russian: targetRussian,
              disambiguationHint: targetRussian,
              distractors: getSmartFallbackDistractors(targetRussian, 6),
              acceptableRussian: item.userRussian ? generateAcceptableRussianVariants(item.userRussian, item.english) : [item.english],
              acceptableEnglish: [item.english.toLowerCase()],
              timestamp: Date.now(),
            };
            results.push(fallbackItem);
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`ИИ запрос: ${errorMsg}`);
        for (const item of batch) {
          const targetRussian = item.userRussian || item.english;
          const fallbackItem: CachedWordData = item.initialData || {
            english: item.english,
            russian: targetRussian,
            disambiguationHint: targetRussian,
            distractors: getSmartFallbackDistractors(targetRussian, 6),
            acceptableRussian: item.userRussian ? generateAcceptableRussianVariants(item.userRussian, item.english) : [item.english],
            acceptableEnglish: [item.english.toLowerCase()],
            timestamp: Date.now(),
          };
          results.push(fallbackItem);
        }
      }
    }

    if (onProgress) {
      onProgress(total, total, 'Подготовка завершена');
    }

    return { data: results, errors };
  }
}
