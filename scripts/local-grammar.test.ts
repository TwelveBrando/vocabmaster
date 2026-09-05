import assert from 'node:assert/strict';
import { buildPracticePool } from '../src/data/grammarPracticeData';
import { GRAMMAR_A1_TOPICS } from '../src/data/grammarA1Data';
import { generateLocalGrammarExercises } from '../src/services/localGrammarGenerator';
import { GrammarService, grammarAnswersMatch } from '../src/services/grammarService';

const values = new Map<string, string>();
Object.assign(globalThis, { localStorage: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
} });
globalThis.fetch = async () => { throw new Error('Local practice must never call the network'); };
let seed = 981273;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const lessons = GRAMMAR_A1_TOPICS.flatMap(topic => topic.subtopics.map(subtopic => subtopic.lectureId));
let questionCount = 0;
let poolCount = 0;
for (const lectureId of lessons) {
  const pool = buildPracticePool(lectureId);
  poolCount += pool.length;
  assert.ok(pool.length >= 63, `${lectureId}: at least three sets of material`);
  const lookup = new Map(pool.map(item => [item.key, item]));
  assert.equal(lookup.size, pool.length, `${lectureId}: duplicate authored candidates`);
  for (const item of pool) {
    assert.equal(item.sentence.split('___').length, 2, `${lectureId}: exactly one target slot`);
    assert.ok(item.wrong.length >= 2, `${lectureId}: insufficient wrong alternatives: ${item.key}`);
    assert.ok(item.wrong.every(wrong => !item.answer.split('/').some(answer => grammarAnswersMatch(answer, wrong))));
  }
  let previousKeys = new Set<string>();
  for (let round = 0; round < 20; round++) {
    const set = generateLocalGrammarExercises(lectureId, random);
    const lists = [set.multipleChoice, set.fillBlank, set.findMistake];
    assert.deepEqual(lists.map(list => list.length), [7, 7, 7]);
    const exercises = lists.flat();
    const keys = exercises.map(exercise => exercise.id.slice(exercise.id.indexOf(':') + 1));
    assert.equal(new Set(keys).size, 21);
    assert.equal(new Set(keys.map(key => lookup.get(key)!.vocabulary)).size, 21, `${lectureId}: repeated key vocabulary`);
    assert.ok(keys.every(key => !previousKeys.has(key)), `${lectureId}, round ${round}: immediately repeated scene`);
    for (const exercise of exercises) {
      assert.ok(exercise.question && exercise.prompt && exercise.explanation);
      if (exercise.type !== 'fill_blank') {
        assert.ok(exercise.options && exercise.options.length >= 2);
        assert.equal(new Set(exercise.options.map(option => option.toLowerCase())).size, exercise.options.length);
        assert.equal(exercise.options.filter(option => grammarAnswersMatch(option, exercise.correctAnswer)).length, 1);
      }
      if (exercise.type === 'find_mistake') {
        const item = lookup.get(exercise.id.slice(exercise.id.indexOf(':') + 1))!;
        assert.ok(item.wrong.some(wrong => exercise.question === item.sentence.replace('___', wrong)));
        assert.ok(exercise.correctAnswer.endsWith(` → ${item.answer}`));
      }
    }
    questionCount += exercises.length;
    previousKeys = new Set(keys);
    if (round === 0) {
      const excluded = [...set.multipleChoice, ...set.findMistake].map(exercise => exercise.id);
      const next = generateLocalGrammarExercises(lectureId, random, { onlyType: 'fill_blank', excludeIds: excluded });
      assert.equal(next.fillBlank.length, 7);
      assert.equal(next.multipleChoice.length + next.findMistake.length, 0);
      const otherVocabulary = new Set(excluded.map(id => lookup.get(id.slice(id.indexOf(':') + 1))!.vocabulary));
      assert.ok(next.fillBlank.every(exercise => !otherVocabulary.has(lookup.get(exercise.id.slice(exercise.id.indexOf(':') + 1))!.vocabulary)));
    }
  }
}
values.set('vocab_grammar_local_history_v1', '{broken');
assert.equal(generateLocalGrammarExercises(lessons[0], random).multipleChoice.length, 7);
values.set('vocab_grammar_local_history_v1', JSON.stringify({ [lessons[0]]: { seen: 3 } }));
assert.equal(generateLocalGrammarExercises(lessons[0], random).multipleChoice.length, 7);
Object.assign(globalThis, { localStorage: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } } });
assert.equal(generateLocalGrammarExercises(lessons[0], random).fillBlank.length, 7);
Object.assign(globalThis, { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
const service = new GrammarService();
const score = service.recordExerciseScore('local-score', 7, 6, 5, 21).passedExercises['local-score'];
assert.equal(score.totalScore, 18);
assert.equal(score.maxPossible, 21);
assert.equal(service.recordExerciseScore('old-score', 5, 5, 5, 15).passedExercises['old-score'].maxPossible, 15);
assert.ok(service.getA1Topics().every(topic => topic.subtopics.every(subtopic => subtopic.exercisesCount === 21)));
assert.throws(() => generateLocalGrammarExercises('missing-lecture'), /недостаточно/);
console.log(`Local grammar passed: ${lessons.length} lectures, ${poolCount} authored variants, ${questionCount} generated questions, per-exercise regeneration, history, unavailable storage, scores, no network.`);
