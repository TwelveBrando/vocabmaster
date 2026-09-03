import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const { AIService, hasUsefulDisambiguationContext } = await vite.ssrLoadModule('/src/services/aiService.ts');
  const { buildTestQuestions } = await vite.ssrLoadModule('/src/services/testBuilder.ts');

  test('bare translation is not treated as generated context', () => {
    assert.equal(hasUsefulDisambiguationContext({
      russian: 'лестница',
      disambiguationHint: 'лестница',
    }), false);
  });

  test('a disambiguating usage note is treated as useful context', () => {
    assert.equal(hasUsefulDisambiguationContext({
      russian: 'лестница',
      disambiguationHint: 'лестница (ступени между этажами; не переносная)',
    }), true);
  });

  test('Russian-to-English questions accept stairs but reject ladder', () => {
    const [question] = buildTestQuestions([{
      english: 'stairs',
      russian: 'лестница',
      disambiguationHint: 'лестница (ступени между этажами; не переносная)',
      distractors: [],
      acceptableRussian: ['лестница'],
      acceptableEnglish: ['stairs'],
      timestamp: Date.now(),
    }], 'mode2_ru_to_en');

    assert.deepEqual(question.acceptableAnswers, ['stairs']);
    assert.equal(question.acceptableAnswers.includes('ladder'), false);
    assert.match(question.disambiguationHint, /ступени между этажами/);
  });

  test('Gemini keeps the key out of URLs and skips a model after one 404', async () => {
    const originalFetch = globalThis.fetch;
    const originalLocalStorage = globalThis.localStorage;
    const requests = [];
    const stored = new Map();
    let successfulGenerations = 0;

    globalThis.localStorage = {
      get length() { return stored.size; },
      clear: () => stored.clear(),
      getItem: key => stored.get(key) ?? null,
      key: index => Array.from(stored.keys())[index] ?? null,
      removeItem: key => stored.delete(key),
      setItem: (key, value) => stored.set(key, String(value)),
    };

    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), headers: new Headers(init.headers) });
      if (String(url).endsWith('/models')) {
        return Response.json({ models: [
          { name: 'models/unavailable-model', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        ] });
      }
      if (String(url).includes('unavailable-model')) {
        return Response.json({ error: { message: 'Model not found' } }, { status: 404 });
      }
      const requestedEnglish = successfulGenerations++ === 0 ? 'stairs' : 'ladder';
      return Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          items: [{
            english: requestedEnglish,
            russian: 'лестница',
            disambiguationHint: requestedEnglish === 'stairs'
              ? 'лестница (ступени между этажами; не переносная)'
              : 'лестница (переносная, приставная)',
            distractors: ['лифт', 'коридор'],
            acceptableRussian: ['лестница'],
            acceptableEnglish: [requestedEnglish],
          }],
        }) }] } }],
      });
    };

    try {
      const settings = {
        provider: 'gemini',
        apiKey: 'secret-test-key',
        model: 'unavailable-model',
        theme: 'language_explorer',
        soundEnabled: true,
        autoAdvanceCorrect: true,
        autoAdvanceDelayMs: 450,
      };
      const readyBatches = [];
      const { data, errors } = await AIService.fetchWordsData(
        ['stairs'],
        settings,
        undefined,
        (batch, processed, total) => readyBatches.push({ batch, processed, total }),
      );

      assert.equal(errors.length, 0);
      assert.equal(data[0].contextSource, 'ai');
      assert.deepEqual(data[0].acceptableEnglish, ['stairs']);
      assert.equal(readyBatches.length, 1);
      assert.equal(readyBatches[0].batch[0].english, 'stairs');
      assert.deepEqual([readyBatches[0].processed, readyBatches[0].total], [1, 1]);
      assert.equal(requests.filter(request => request.url.includes('unavailable-model')).length, 1);
      assert.equal(requests.every(request => !request.url.includes('secret-test-key')), true);
      assert.equal(requests.every(request => request.headers.get('x-goog-api-key') === 'secret-test-key'), true);

      const second = await AIService.fetchWordsData(['ladder'], settings);
      assert.equal(second.data[0].english, 'ladder');
      assert.equal(requests.filter(request => request.url.endsWith('/models')).length, 1);
      assert.equal(requests.filter(request => request.url.includes('unavailable-model')).length, 1);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.localStorage = originalLocalStorage;
    }
  });
} finally {
  await vite.close();
}
