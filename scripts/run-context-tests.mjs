import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const { hasUsefulDisambiguationContext } = await vite.ssrLoadModule('/src/services/aiService.ts');
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
} finally {
  await vite.close();
}
