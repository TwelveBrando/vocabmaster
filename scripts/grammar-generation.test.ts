import assert from 'node:assert/strict';
import { GrammarService } from '../src/services/grammarService';
import { settingsService } from '../src/services/settingsService';
import type { AISettings } from '../src/types';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

Object.assign(globalThis, {
  window: globalThis,
  localStorage: new MemoryStorage(),
});

const storage = globalThis.localStorage as unknown as MemoryStorage;
const service = new GrammarService();
const firstTopic = service.getA1Topics()[0];
const lecture = service.getLectureById(firstTopic.subtopics[0].lectureId);
assert.ok(lecture, 'A1 lecture fixture must exist');

const settings: AISettings = {
  provider: 'gemini',
  apiKey: 'test-key',
  apiKeys: { gemini: 'test-key' },
  model: 'gemini-3.5-flash-lite',
  theme: 'cyber_oasis',
  soundEnabled: false,
  autoAdvanceCorrect: false,
  autoAdvanceDelayMs: 0,
};

function makeExercises(prefix: string, duplicateOptions = false, repetitive = false) {
  const multipleChoiceScenes = repetitive
    ? Array.from({ length: 5 }, (_, index) => `silver mechanism ${index + 1} ______ before sunrise`)
    : [
        'silver mechanism ______ before sunrise',
        'wild orchid ______ beside the waterfall',
        'fresh bread ______ on this wooden shelf',
        'two lanterns ______ above the quiet gate',
        'my wool scarf ______ surprisingly soft',
      ];
  const fillBlankScenes = [
    'harbor beacon ______ (flash) after dusk',
    'paper kite ______ (rise) in the warm wind',
    'tiny robot ______ (carry) the blue package',
    'winter berries ______ (look) bright today',
    'her violin ______ (sound) gentle tonight',
  ];
  const mistakeScenes = [
    'parcel arrive at noon',
    'marble statue are extremely heavy',
    'these candle is made of beeswax',
    'old telescope am in the attic',
    'his gloves is completely dry',
  ];
  return {
    multipleChoice: Array.from({ length: 5 }, (_, index) => ({
      id: `mc_${index + 1}`,
      type: 'multiple_choice',
      question: `${prefix}Choice${index + 1} ${multipleChoiceScenes[index]}.`,
      options: duplicateOptions && index === 0 ? ['works', 'works', 'work', 'working'] : ['works', 'work', 'worked', 'working'],
      correctAnswer: 'works',
      explanation: 'Форма согласуется с подлежащим в единственном числе.',
      hint: 'Определите число подлежащего.',
    })),
    fillBlank: Array.from({ length: 5 }, (_, index) => ({
      id: `fill_${index + 1}`,
      type: 'fill_blank',
      question: `${prefix}Fill${index + 1} ${fillBlankScenes[index]}.`,
      prompt: 'Поставьте глагол в правильную форму.',
      correctAnswer: 'flashes',
      acceptableAnswers: [],
      explanation: 'После подлежащего в третьем лице нужен глагол с окончанием.',
      hint: 'Обратите внимание на подлежащее.',
    })),
    findMistake: Array.from({ length: 5 }, (_, index) => ({
      id: `mistake_${index + 1}`,
      type: 'find_mistake',
      question: `${prefix}Mistake${index + 1} ${mistakeScenes[index]}.`,
      prompt: 'Найдите ошибку и выберите верное исправление',
      options: ['arrive → arrives', 'parcel → parcels', 'at → on', 'noon → noons'],
      correctAnswer: 'arrive → arrives',
      explanation: 'Глагол должен согласовываться с подлежащим.',
      hint: 'Проверьте форму сказуемого.',
    })),
  };
}

function geminiResponse(exercises: ReturnType<typeof makeExercises>): Response {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(exercises) }] } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

const requestBodies: Record<string, unknown>[] = [];
const requestUrls: string[] = [];
let fixture = makeExercises('Quartz');
let fetchCalls = 0;
globalThis.fetch = async (input, init) => {
  fetchCalls += 1;
  requestUrls.push(String(input));
  assert.match(String(input), /models\/gemini-[^/]+:generateContent$/);
  requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
  return geminiResponse(fixture);
};

const generated = await service.generateLiveExercises(lecture, settings);
assert.equal(fetchCalls, 1, 'generation must use one network request');
assert.match(requestUrls[0], /models\/gemini-3\.5-flash-lite:generateContent$/);
assert.equal(generated.multipleChoice.length, 5);
assert.equal(generated.fillBlank.length, 5);
assert.equal(generated.findMistake.length, 5);
assert.equal(generated.source, 'ai');
assert.equal(generated.modelName, 'Gemini 3.5 Flash-Lite');

const firstConfig = requestBodies[0].generationConfig as {
  thinkingConfig: { thinkingLevel: string };
  responseMimeType: string;
  responseJsonSchema: { properties: { multipleChoice: { minItems: number } } };
  maxOutputTokens: number;
};
assert.equal(firstConfig.thinkingConfig.thinkingLevel, 'minimal', 'Flash-Lite must use its fastest thinking level');
assert.equal(firstConfig.responseMimeType, 'application/json');
assert.equal(firstConfig.responseJsonSchema.properties.multipleChoice.minItems, 5);
assert.equal(firstConfig.maxOutputTokens, 4096, 'exercise explanations must have a bounded output budget');

fixture = makeExercises('Velvet');
await service.generateLiveExercises(lecture, settings);
const secondPrompt = (((requestBodies[1].contents as { parts: { text: string }[] }[])[0]).parts[0]).text;
assert.match(secondPrompt, /tiny robot/, 'recent AI questions must be sent back as compact novelty history');

storage.removeItem('vocab_grammar_ai_history_v1');
fixture = makeExercises('ShortOne');
fixture.multipleChoice[0].question = 'I ______ ready.';
await service.generateLiveExercises(lecture, settings);
fixture = makeExercises('ShortTwo');
fixture.multipleChoice[0].question = 'I ______ ready.';
await assert.rejects(
  service.generateLiveExercises(lecture, settings),
  /повторил недавний сюжет или лексику/,
  'exact short A1 questions must be rejected across generations',
);

storage.removeItem('vocab_grammar_ai_history_v1');
fixture = makeExercises('Budget');
await service.generateLiveExercises(lecture, { ...settings, model: 'gemini-2.5-flash' });
const legacyThinkingConfig = requestBodies.at(-1)?.generationConfig as { thinkingConfig: { thinkingBudget: number } };
assert.equal(legacyThinkingConfig.thinkingConfig.thinkingBudget, 0, 'Gemini 2.5 must use thinkingBudget');

const allLectureIds = service.getA1Topics().flatMap((topic) => topic.subtopics.map((subtopic) => subtopic.lectureId));
assert.equal(allLectureIds.length, 25, 'the A1 course must expose 25 lectures');
for (const lectureId of allLectureIds) {
  storage.removeItem('vocab_grammar_ai_history_v1');
  fixture = makeExercises(`Coverage${lectureId.replace(/[^a-z0-9]/gi, '')}`);
  const currentLecture = service.getLectureById(lectureId);
  assert.ok(currentLecture, `lecture ${lectureId} must be resolvable`);
  const coverageResult = await service.generateLiveExercises(currentLecture, settings);
  assert.equal(coverageResult.multipleChoice.length + coverageResult.fillBlank.length + coverageResult.findMistake.length, 15);
}

storage.clear();
const callsBeforeMissingKey = fetchCalls;
await assert.rejects(
  service.generateLiveExercises(lecture, { ...settings, apiKey: '', apiKeys: { gemini: '' } }),
  /Gemini API-ключ/,
);
assert.equal(fetchCalls, callsBeforeMissingKey, 'missing key must fail before a network request');

fixture = makeExercises('Copper', true);
await assert.rejects(
  service.generateLiveExercises(lecture, settings),
  /повторил варианты ответа/,
  'invalid AI output must fail instead of falling back to lecture templates',
);

storage.removeItem('vocab_grammar_ai_history_v1');
fixture = makeExercises('NoCue');
fixture.fillBlank[0].question = 'NoCue the lantern ______ at dawn.';
const noCueResult = await service.generateLiveExercises(lecture, settings);
assert.equal(noCueResult.fillBlank.length, 5, 'a valid AI fill-in exercise must not fail merely because it has no parenthesized cue');

storage.removeItem('vocab_grammar_ai_history_v1');
fixture = makeExercises('Hyphen');
fixture.multipleChoice[0].options[0] = 'works-now';
fixture.multipleChoice[0].correctAnswer = 'works now';
await assert.rejects(
  service.generateLiveExercises(lecture, settings),
  /Правильный ответ отсутствует/,
  'validator and UI must use the same punctuation-preserving answer comparison',
);

fixture = makeExercises('Repeat', false, true);
await assert.rejects(
  service.generateLiveExercises(lecture, settings),
  /(?:слишком похожие предложения|повторил ключевое слово)/,
  'near-identical sentence frames and repeated content words must be rejected',
);

storage.clear();
settingsService.saveSettings(settings);
assert.equal(storage.getItem('vocabmaster_key_gemini'), 'test-key');
settingsService.saveSettings({ ...settings, apiKey: '', apiKeys: { gemini: '' } });
assert.equal(storage.getItem('vocabmaster_key_gemini'), null, 'clearing a key must remove its legacy copy');
assert.equal(settingsService.getSettings().apiKey, '', 'a cleared key must not reappear on reload');
settingsService.saveSettings({ ...settings, model: 'gemini-3.5-flash' });
assert.equal(settingsService.getSettings().model, 'gemini-3.5-flash', 'an explicit 3.5 selection must survive reload');

let resolveDiskSettings: ((value: AISettings) => void) | undefined;
(globalThis.window as typeof window & { electronAPI?: Record<string, unknown> }).electronAPI = {
  getSettingsDisk: () => new Promise<AISettings>((resolve) => { resolveDiskSettings = resolve; }),
  saveSettingsDisk: () => undefined,
};
const pendingDiskSync = settingsService.syncWithDisk();
settingsService.saveSettings({ ...settings, apiKey: '', apiKeys: { gemini: '' } });
assert.ok(resolveDiskSettings);
resolveDiskSettings(settings);
assert.equal(await pendingDiskSync, null, 'a stale disk read must not resurrect a key cleared while sync is pending');
assert.equal(settingsService.getSettings().apiKey, '');

storage.removeItem('vocab_grammar_ai_history_v1');
fixture = makeExercises('Local');
let customRequestUrl = '';
let customAuthorization: string | null = null;
globalThis.fetch = async (input, init) => {
  customRequestUrl = String(input);
  customAuthorization = new Headers(init?.headers).get('Authorization');
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(fixture) } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
const customResult = await service.generateLiveExercises(lecture, {
  ...settings,
  provider: 'custom',
  apiKey: '',
  apiKeys: { custom: '' },
  baseUrl: 'http://localhost:11434/v1',
  model: 'local-model',
});
assert.equal(customResult.multipleChoice.length, 5);
assert.equal(customRequestUrl, 'http://localhost:11434/v1/chat/completions');
assert.equal(customAuthorization, null, 'a local custom endpoint must not require a fake bearer token');

globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
});
const controller = new AbortController();
const pending = service.generateLiveExercises(lecture, settings, { signal: controller.signal });
controller.abort();
await assert.rejects(pending, (error: unknown) => error instanceof DOMException && error.name === 'AbortError');

console.log('Grammar generation tests passed: 25 lectures, provider configs, schema, diversity, keys, local endpoint, cancellation.');
