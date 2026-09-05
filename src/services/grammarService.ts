import { GRAMMAR_A1_TOPICS, GRAMMAR_A1_LECTURES } from '../data/grammarA1Data';
import type {
  GrammarTopic,
  GrammarLecture,
  GrammarExercise,
  GrammarUserProgress,
} from '../types/grammar';
import type { AIProvider, AISettings } from '../types';

const PROGRESS_STORAGE_KEY = 'vocab_grammar_progress_v2';
const GENERATION_HISTORY_KEY = 'vocab_grammar_ai_history_v1';
const RECOMMENDED_GEMINI_MODEL = 'gemini-3.5-flash-lite';
// A complete structured set contains 15 exercises. Free-tier requests sometimes
// spend more than 25 seconds in the provider queue even with low thinking; 45 s
// avoids throwing away an otherwise valid answer while still bounding the wait.
const REQUEST_TIMEOUT_MS = 45_000;

interface ExerciseSets {
  multipleChoice: GrammarExercise[];
  fillBlank: GrammarExercise[];
  findMistake: GrammarExercise[];
}

export interface GeneratedExerciseSets extends ExerciseSets {
  source: 'ai';
  modelName: string;
  elapsedMs: number;
}

interface GenerationOptions {
  signal?: AbortSignal;
}

interface GenerationHistory {
  byLecture: Record<string, string[]>;
  global: string[];
}

type FetchErrorBody = {
  error?: {
    message?: string;
    status?: string;
  };
};

const EMPTY_HISTORY: GenerationHistory = { byLecture: {}, global: [] };
const EXPANDED_LECTURE_MINUTES = 4;
// These are grammatical glue words, not vocabulary supplied to the model. They
// are excluded only when auditing repeated *content* words in AI output.
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has',
  'had', 'not', 'no', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'as', 'into',
  'after', 'before', 'over', 'under', 'near', 'where', 'when', 'what', 'who', 'why', 'how',
]);

function resolvedExerciseSentence(exercise: GrammarExercise): string | null {
  if (exercise.type === 'find_mistake') {
    const [wrong, correct] = exercise.correctAnswer.split(/\s*(?:→|->)\s*/);
    return wrong && correct ? exercise.question.replace(wrong, correct) : null;
  }
  return exercise.question.includes('______')
    ? exercise.question.replace('______', exercise.correctAnswer)
    : exercise.question;
}

/**
 * Every A1 lesson shares the same deeper finishing block. It turns the existing
 * assessed examples into explained, correct sentences, so the learner sees the
 * rule in context before opening the exercise sets.
 */
function enrichLecture(lecture: GrammarLecture): GrammarLecture {
  const sourceExercises = [
    ...lecture.exercises.multipleChoice.slice(0, 2),
    ...lecture.exercises.fillBlank.slice(0, 2),
  ];
  const examples = sourceExercises
    .map((exercise) => {
      const english = resolvedExerciseSentence(exercise);
      return english ? {
        english,
        russian: `Разбор: ${exercise.explanation}`,
        note: exercise.hint,
      } : null;
    })
    .filter((example): example is { english: string; russian: string; note: string } => example !== null);

  return {
    ...lecture,
    readTimeMinutes: lecture.readTimeMinutes + EXPANDED_LECTURE_MINUTES,
    contentSections: [
      ...lecture.contentSections,
      {
        title: 'Практика в контексте: разбираем четыре примера',
        paragraphs: [
          'Недостаточно просто выучить формулу: сначала прочитайте каждое предложение целиком, определите подлежащее и только затем назовите правило. Такой порядок помогает перестать переводить фразу слово за словом.',
          'Сверьте своё решение с разбором под примером. Если ответ оказался неверным, проговорите исправленный вариант вслух и составьте ещё один похожий пример о себе. Это превращает правило из таблицы в навык.',
          'Мини-проверка перед упражнениями: могу ли я объяснить, почему здесь именно эта форма, и могу ли я заменить подлежащее так, чтобы форма изменилась правильно? Если да — переходите к тесту.',
        ],
        examples,
        callout: {
          type: 'note',
          title: 'Как работать с примерами',
          text: 'Закройте строку «Разбор», ответьте самостоятельно, а затем проверьте себя. Ошибка здесь — полезная подсказка, а не потерянный балл.',
        },
      },
    ],
  };
}

const exerciseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    multipleChoice: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['multiple_choice'] },
          question: { type: 'string' },
          options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
          correctAnswer: { type: 'string' },
          explanation: { type: 'string' },
          hint: { type: 'string' },
        },
        required: ['id', 'type', 'question', 'options', 'correctAnswer', 'explanation', 'hint'],
      },
    },
    fillBlank: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['fill_blank'] },
          question: { type: 'string' },
          prompt: { type: 'string' },
          correctAnswer: { type: 'string' },
          acceptableAnswers: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
          hint: { type: 'string' },
        },
        required: [
          'id', 'type', 'question', 'prompt', 'correctAnswer', 'acceptableAnswers', 'explanation', 'hint',
        ],
      },
    },
    findMistake: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['find_mistake'] },
          question: { type: 'string' },
          prompt: { type: 'string' },
          options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
          correctAnswer: { type: 'string' },
          explanation: { type: 'string' },
          hint: { type: 'string' },
        },
        required: [
          'id', 'type', 'question', 'prompt', 'options', 'correctAnswer', 'explanation', 'hint',
        ],
      },
    },
  },
  required: ['multipleChoice', 'fillBlank', 'findMistake'],
} as const;

function combineSignals(externalSignal?: AbortSignal): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS);
  const abortFromExternal = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) abortFromExternal();
  else externalSignal?.addEventListener('abort', abortFromExternal, { once: true });

  return {
    signal: controller.signal,
    dispose: () => {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortFromExternal);
    },
  };
}

function normalizeComparable(value: string): string {
  return value
    .toLocaleLowerCase('en-US')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9а-яё']+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeGrammarAnswer(value: string): string {
  return value.trim().toLocaleLowerCase('en-US').replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
}

export function grammarAnswersMatch(left: string, right: string): boolean {
  return normalizeGrammarAnswer(left) === normalizeGrammarAnswer(right);
}

function lexicalSimilarity(left: string, right: string): number {
  const tokens = (value: string) => new Set(
    normalizeComparable(value)
      .split(' ')
      .filter((token) => token.length > 1 && !/^\d+$/.test(token)),
  );
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.size < 3 || rightTokens.size < 3) return 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function contentTokens(value: string): string[] {
  return Array.from(new Set(
    normalizeComparable(value)
      .split(' ')
      .filter((token) => token.length >= 4 && !/^\d+$/.test(token) && !FUNCTION_WORDS.has(token)),
  ));
}

function readableApiError(provider: AIProvider, status: number, rawBody: string): Error {
  let detail = '';
  try {
    const parsed = JSON.parse(rawBody) as FetchErrorBody;
    detail = parsed.error?.message || parsed.error?.status || '';
  } catch {
    detail = rawBody;
  }
  const shortDetail = detail.replace(/\s+/g, ' ').trim().slice(0, 220);

  if (status === 401 || status === 403) {
    return new Error(`API отклонил ключ ${provider}. Проверьте ключ в настройках.`);
  }
  if (status === 429) {
    return new Error('Бесплатный лимит запросов временно исчерпан. Подождите немного и повторите попытку.');
  }
  if (status === 404) {
    return new Error(`Модель не найдена у провайдера ${provider}. Выберите актуальную модель в настройках.`);
  }
  return new Error(`Ошибка ${provider} API (${status})${shortDetail ? `: ${shortDetail}` : ''}`);
}

export class GrammarService {
  getA1Topics(): GrammarTopic[] {
    return GRAMMAR_A1_TOPICS.map((topic) => ({
      ...topic,
      subtopics: topic.subtopics.map((subtopic) => ({
        ...subtopic,
        exercisesCount: 21,
        readTimeMinutes: subtopic.readTimeMinutes + EXPANDED_LECTURE_MINUTES,
      })),
    }));
  }

  getLectureById(lectureId: string): GrammarLecture | null {
    const lecture = GRAMMAR_A1_LECTURES[lectureId];
    return lecture ? enrichLecture(lecture) : null;
  }

  getLectureBySubtopicId(subtopicId: string): GrammarLecture | null {
    const lecture = Object.values(GRAMMAR_A1_LECTURES).find((candidate) => candidate.subtopicId === subtopicId);
    return lecture ? enrichLecture(lecture) : null;
  }

  findTopicBySubtopicId(subtopicId: string): { topic: GrammarTopic; subtopicIndex: number } | null {
    for (const topic of GRAMMAR_A1_TOPICS) {
      const subtopicIndex = topic.subtopics.findIndex((subtopic) => subtopic.id === subtopicId);
      if (subtopicIndex !== -1) return { topic, subtopicIndex };
    }
    return null;
  }

  getUserProgress(): GrammarUserProgress {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as GrammarUserProgress;
    } catch {
      // A quiz must remain usable even if storage is unavailable.
    }
    return { completedSubtopics: [], passedExercises: {} };
  }

  markSubtopicCompleted(subtopicId: string): GrammarUserProgress {
    const current = this.getUserProgress();
    if (!current.completedSubtopics.includes(subtopicId)) current.completedSubtopics.push(subtopicId);
    current.lastViewedSubtopicId = subtopicId;
    this.saveUserProgress(current);
    return current;
  }

  recordExerciseScore(
    subtopicId: string,
    choiceScore: number,
    fillScore: number,
    findMistakeScore: number,
    maxPossible = 21,
  ): GrammarUserProgress {
    const current = this.getUserProgress();
    const totalScore = choiceScore + fillScore + findMistakeScore;

    current.passedExercises[subtopicId] = {
      choiceScore,
      fillScore,
      findMistakeScore,
      totalScore,
      maxPossible,
      timestamp: Date.now(),
    };

    if (totalScore / maxPossible >= 0.6 && !current.completedSubtopics.includes(subtopicId)) {
      current.completedSubtopics.push(subtopicId);
    }
    this.saveUserProgress(current);
    return current;
  }

  private saveUserProgress(progress: GrammarUserProgress): void {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore unavailable storage.
    }
  }

  /** Makes one bounded AI request. Static lecture exercises are never used as a fallback. */
  async generateLiveExercises(
    lecture: GrammarLecture,
    settings?: AISettings,
    options: GenerationOptions = {},
  ): Promise<GeneratedExerciseSets> {
    const provider = settings?.provider || 'gemini';
    const apiKey = this.getProviderKey(provider, settings);
    const localCustomEndpoint = provider === 'custom'
      && /^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(
        settings?.baseUrl || 'http://localhost:11434/v1',
      );
    if (!apiKey && !localCustomEndpoint) {
      throw new Error(
        provider === 'gemini'
          ? 'Нужен бесплатный Gemini API-ключ. Откройте настройки и вставьте ключ из сервиса Google.'
          : `Для генерации нужен API-ключ провайдера ${provider}. Добавьте его в настройках.`,
      );
    }

    const model = this.getModel(provider, settings);
    const startedAt = performance.now();
    const { signal, dispose } = combineSignals(options.signal);

    try {
      // A model can occasionally ignore one diversity instruction. Reject that
      // candidate and ask the AI once more; no templates or local word lists are
      // used to construct the replacement exercises.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const rawText = await this.requestExercises(
          provider,
          model,
          apiKey,
          this.buildPrompt(lecture, attempt),
          settings,
          signal,
        );
        try {
          const parsed = this.parseAndValidateExerciseJson(rawText);
          this.rememberGeneratedQuestions(lecture.id, parsed);
          return {
            ...parsed,
            source: 'ai',
            modelName: provider === 'gemini' && model === RECOMMENDED_GEMINI_MODEL
              ? 'Gemini 3.5 Flash-Lite'
              : `${provider} (${model})`,
            elapsedMs: Math.round(performance.now() - startedAt),
          };
        } catch (error) {
          if (attempt === 1) throw error;
        }
      }
      throw new Error('Не удалось создать достаточно разнообразный набор упражнений.');
    } catch (error) {
      if (options.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
      if (signal.aborted) {
        throw new Error('Генерация заняла больше 45 секунд и была остановлена. Повторите попытку.');
      }
      if (error instanceof Error) throw error;
      throw new Error('Неизвестная ошибка генерации упражнений.');
    } finally {
      dispose();
    }
  }

  private getProviderKey(provider: AIProvider, settings?: AISettings): string {
    const stored = (key: string): string => {
      try {
        return localStorage.getItem(key) || '';
      } catch {
        return '';
      }
    };
    const legacyKeys: Record<AIProvider, string[]> = {
      gemini: ['vocabmaster_key_gemini', 'gemini_api_key'],
      groq: ['vocabmaster_key_groq', 'groq_api_key'],
      openrouter: ['vocabmaster_key_openrouter'],
      custom: ['vocabmaster_key_custom'],
    };

    return (
      settings?.apiKeys?.[provider]
      || (settings?.provider === provider ? settings.apiKey : '')
      || legacyKeys[provider].map(stored).find(Boolean)
      || ''
    ).trim();
  }

  private getModel(provider: AIProvider, settings?: AISettings): string {
    if (provider === 'gemini') return settings?.model || RECOMMENDED_GEMINI_MODEL;
    if (provider === 'groq') return settings?.model || 'openai/gpt-oss-120b';
    if (provider === 'openrouter') return settings?.model || 'openrouter/free';
    return settings?.model || 'gpt-4o-mini';
  }

  private async requestExercises(
    provider: AIProvider,
    model: string,
    apiKey: string,
    prompt: string,
    settings: AISettings | undefined,
    signal: AbortSignal,
  ): Promise<string> {
    if (provider === 'gemini') {
      const thinkingConfig = model === RECOMMENDED_GEMINI_MODEL
        ? { thinkingLevel: 'minimal' }
        : model.startsWith('gemini-3')
          ? { thinkingLevel: 'low' }
        : model.startsWith('gemini-2.5-flash')
          ? { thinkingBudget: 0 }
          : undefined;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: 'You create accurate English grammar exercises. Follow the JSON schema exactly.' }],
            },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              ...(thinkingConfig ? { thinkingConfig } : {}),
              // `responseFormat.text` is the newer Interactions-style shape. The
              // GenerateContent endpoint used here expects these established REST
              // fields instead; sending the former makes Gemini reject
              // "application/json" as an enum value before generation starts.
              responseMimeType: 'application/json',
              responseJsonSchema: exerciseSchema,
              // The schema needs far fewer tokens than the model's default output
              // allowance. This prevents unexpectedly long explanations.
              maxOutputTokens: 4096,
            },
          }),
        },
      );
      if (!response.ok) throw readableApiError(provider, response.status, await response.text());
      const data = await response.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        promptFeedback?: { blockReason?: string };
      };
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
      if (!text) {
        const reason = data.promptFeedback?.blockReason;
        throw new Error(reason ? `Gemini не вернул задания: ${reason}.` : 'Gemini вернул пустой ответ.');
      }
      return text;
    }

    const endpoint = provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : `${(settings?.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(provider === 'openrouter'
          ? { 'HTTP-Referer': 'https://vocabmaster.app', 'X-Title': 'VocabMaster' }
          : {}),
      },
      signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Return only valid JSON. Create accurate English grammar exercises.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 1,
      }),
    });
    if (!response.ok) throw readableApiError(provider, response.status, await response.text());
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(`${provider} вернул пустой ответ.`);
    return text;
  }

  private buildPrompt(lecture: GrammarLecture, retryAttempt = 0): string {
    const history = this.getGenerationHistory();
    // The validator still checks a much wider history. Keeping the prompt itself
    // compact reduces free-tier queue time and model latency.
    const previousForLecture = history.byLecture[lecture.id]?.slice(-8) || [];
    const recentGlobal = history.global.slice(-8);
    const previousQuestions = Array.from(new Set([...previousForLecture, ...recentGlobal]));
    const lectureReference = lecture.contentSections.map((section) => {
      const parts = [section.title, ...section.paragraphs];
      if (section.table) {
        parts.push(section.table.headers.join(' | '));
        parts.push(...section.table.rows.map((row) => row.join(' | ')));
      }
      if (section.callout) parts.push(section.callout.text);
      if (section.examples) {
        parts.push(...section.examples.map((example) => `${example.english} — ${example.russian}`));
      }
      return parts.filter(Boolean).join('\n');
    }).join('\n\n').slice(0, 6_000);
    const seed = `${Date.now()}-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`;

    return `Create one brand-new set of 15 English grammar exercises for a Russian-speaking learner.

TARGET
- CEFR grammar level: A1
- Lecture: ${lecture.title}
- Subtitle: ${lecture.subtitle}
- Unique generation seed: ${seed}

AUTHORITATIVE LECTURE REFERENCE
Use this only to identify the grammar rules and edge cases. Never copy its example sentences, characters, nouns, places, or scenarios.
${lectureReference}

DIVERSITY CONTRACT — all clauses are mandatory
1. Use 15 unrelated micro-situations with distinct domains, protagonists, settings, actions, and key nouns.
2. Do not reuse a proper name, lexical noun, main verb, adjective, object, or story premise anywhere in this set unless the target grammar itself forces that word.
3. Vary sentence openings, subject forms, polarity, and question/statement structure whenever the target rule allows it. Do not merely swap one noun in the same sentence frame.
4. Do not default to classroom/education stories or place-name/travel stories. Such a domain may appear only if it is genuinely one of the independently invented situations, never as a recurring theme.
5. There is no prescribed vocabulary list and no internal word bank. Choose natural words freely. Keep the sentence understandable, but do not sacrifice variety to textbook clichés.
6. Every sentence must sound natural and describe a coherent real situation, not random word salad.
7. Test only the lecture's grammar target. Each item must have exactly one unambiguous answer.
8. The Russian hint and explanation must teach why the answer is correct; never reveal the answer in the hint. Keep each concise: hint ≤ 12 words, explanation ≤ 24 words.
9. Silently audit variety before returning JSON; rewrite any overlapping scenario.
${retryAttempt > 0 ? '\nRETRY: Your previous candidate was rejected for repeated content. Use entirely new nouns, verbs, adjectives, people, and situations.' : ''}
${previousQuestions.length > 0 ? `
NOVELTY ACROSS GENERATIONS
The following questions were generated recently. Do not paraphrase them, reuse their scenarios, or recycle their distinctive content words:
${previousQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')}
` : ''}
EXERCISE SPECIFICATION
- multipleChoice: exactly 5 items. The question is one English sentence with exactly one "______" gap. Give exactly 4 distinct, plausible options. correctAnswer must exactly equal one option.
- fillBlank: exactly 5 items. The question is one English sentence with exactly one "______" gap. Include a base cue in parentheses when it helps the learner, but never sacrifice a natural sentence for it. prompt is a short Russian instruction. acceptableAnswers contains only genuinely equivalent spellings or contractions.
- findMistake: exactly 5 items. The question is one English sentence with exactly one error belonging to the target rule. Give 4 distinct edits in the format "wrong fragment → corrected fragment"; exactly one edit fully fixes the sentence. correctAnswer must exactly equal that option. prompt is "Найдите ошибку и выберите верное исправление".
- Use ids mc_1..mc_5, fill_1..fill_5, mistake_1..mistake_5 and the matching type values required by the schema.

Return only the JSON object required by the provided response schema.`;
  }

  private parseAndValidateExerciseJson(rawText: string): ExerciseSets {
    const clean = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let value: unknown;
    try {
      value = JSON.parse(clean);
    } catch {
      throw new Error('Модель вернула повреждённый JSON. Повторите генерацию.');
    }
    if (!value || typeof value !== 'object') throw new Error('Модель вернула неверный формат упражнений.');

    const candidate = value as Partial<ExerciseSets>;
    const groups: { key: keyof ExerciseSets; type: GrammarExercise['type'] }[] = [
      { key: 'multipleChoice', type: 'multiple_choice' },
      { key: 'fillBlank', type: 'fill_blank' },
      { key: 'findMistake', type: 'find_mistake' },
    ];
    const allQuestions = new Set<string>();
    const usedContentWords = new Map<string, string>();
    const recentHistory = this.getGenerationHistory().global.slice(-90);
    const timestamp = Date.now();
    const result = {} as ExerciseSets;

    for (const group of groups) {
      const items = candidate[group.key];
      if (!Array.isArray(items) || items.length !== 5) {
        throw new Error(`Модель должна вернуть ровно 5 заданий в разделе ${group.key}.`);
      }

      result[group.key] = items.map((rawItem, index) => {
        if (!rawItem || typeof rawItem !== 'object') throw new Error('Одно из заданий имеет неверный формат.');
        const item = rawItem as GrammarExercise;
        const requiredStrings = [item.question, item.correctAnswer, item.explanation, item.hint];
        if (requiredStrings.some((field) => typeof field !== 'string' || !field.trim())) {
          throw new Error('Модель пропустила обязательный текст в одном из заданий.');
        }
        const normalizedQuestion = normalizeComparable(item.question);
        if (allQuestions.has(normalizedQuestion)) throw new Error('В наборе повторилось одно и то же предложение.');
        for (const previousQuestion of allQuestions) {
          if (lexicalSimilarity(normalizedQuestion, previousQuestion) >= 0.72) {
            throw new Error('В наборе слишком похожие предложения. Повторите генерацию.');
          }
        }
        if (recentHistory.some((previousQuestion) => (
          normalizeComparable(previousQuestion) === normalizedQuestion
          || lexicalSimilarity(normalizedQuestion, previousQuestion) >= 0.82
        ))) {
          throw new Error('Генератор повторил недавний сюжет или лексику. Повторите генерацию.');
        }
        for (const token of contentTokens(normalizedQuestion)) {
          const previousQuestion = usedContentWords.get(token);
          if (previousQuestion) {
            throw new Error(`Генератор повторил ключевое слово «${token}» в нескольких заданиях. Повторите генерацию.`);
          }
          usedContentWords.set(token, normalizedQuestion);
        }
        allQuestions.add(normalizedQuestion);

        if (group.type === 'multiple_choice' || group.type === 'find_mistake') {
          if (!Array.isArray(item.options) || item.options.length !== 4) {
            throw new Error('В задании с выбором должно быть ровно 4 варианта.');
          }
          const uniqueOptions = new Set(item.options.map(normalizeGrammarAnswer));
          if (uniqueOptions.size !== 4) throw new Error('Генератор повторил варианты ответа.');
          if (!uniqueOptions.has(normalizeGrammarAnswer(item.correctAnswer))) {
            throw new Error('Правильный ответ отсутствует среди вариантов.');
          }
        }
        if (group.type !== 'find_mistake' && (item.question.match(/______/g)?.length || 0) !== 1) {
          throw new Error('В задании должно быть ровно одно поле для ответа.');
        }
        if (group.type === 'fill_blank') {
          if (!Array.isArray(item.acceptableAnswers)) {
            throw new Error('Не указаны допустимые варианты ответа.');
          }
        }
        if (group.type === 'find_mistake' && item.options?.some((option) => !/(?:→|->)/.test(option))) {
          throw new Error('Варианты исправления имеют неверный формат.');
        }

        return {
          ...item,
          id: `ai_${group.type}_${timestamp}_${index}`,
          type: group.type,
          options: item.options?.map((option) => option.trim()),
          acceptableAnswers: item.acceptableAnswers?.map((answer) => answer.trim()).filter(Boolean),
          question: item.question.trim(),
          prompt: item.prompt?.trim(),
          correctAnswer: item.correctAnswer.trim(),
          explanation: item.explanation.trim(),
          hint: item.hint?.trim(),
        };
      });
    }

    return result;
  }

  private getGenerationHistory(): GenerationHistory {
    try {
      const raw = localStorage.getItem(GENERATION_HISTORY_KEY);
      if (!raw) return EMPTY_HISTORY;
      const parsed = JSON.parse(raw) as Partial<GenerationHistory>;
      return {
        byLecture: parsed.byLecture && typeof parsed.byLecture === 'object' ? parsed.byLecture : {},
        global: Array.isArray(parsed.global) ? parsed.global : [],
      };
    } catch {
      return EMPTY_HISTORY;
    }
  }

  private rememberGeneratedQuestions(lectureId: string, sets: ExerciseSets): void {
    try {
      const history = this.getGenerationHistory();
      const questions = [
        ...sets.multipleChoice,
        ...sets.fillBlank,
        ...sets.findMistake,
      ].map((exercise) => exercise.question);
      history.byLecture[lectureId] = [...(history.byLecture[lectureId] || []), ...questions].slice(-60);
      history.global = [...history.global, ...questions].slice(-90);
      localStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // History improves novelty but must never block a quiz.
    }
  }
}

export const grammarService = new GrammarService();
