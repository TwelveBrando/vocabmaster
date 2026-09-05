import type { GrammarExercise, GrammarExerciseType } from '../types/grammar';
import { buildPracticePool, type PracticeItem } from '../data/grammarPracticeData';

export const GRAMMAR_SET_SIZE = 7;
const HISTORY_KEY = 'vocab_grammar_local_history_v1';
interface History { seen: string[]; recentVocabulary: string[] }
let memory: Record<string, History> = {};

function readHistory(): Record<string, History> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const valid: Record<string, History> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value && Array.isArray(value.seen) && value.seen.every((s: unknown) => typeof s === 'string')
          && Array.isArray(value.recentVocabulary) && value.recentVocabulary.every((s: unknown) => typeof s === 'string')) valid[key] = value;
      }
      memory = valid;
    }
  } catch { /* Keep session history if storage is unavailable. */ }
  return memory;
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function toExercise(item: PracticeItem, type: GrammarExerciseType, random: () => number): GrammarExercise {
  const choices = [item.answer, ...shuffle(item.wrong, random).slice(0, 3)];
  const wrong = choices[1];
  const replacement = (value: string) => `${wrong} → ${value}`;
  const mistake = type === 'find_mistake';
  return {
    id: `${type}:${item.key}`,
    type,
    question: item.sentence.replace('___', mistake ? wrong : '______'),
    prompt: mistake ? `Исправьте форму «${wrong}» по условию. ${item.cue}` : item.cue,
    correctAnswer: mistake ? replacement(item.answer) : item.answer,
    options: type === 'fill_blank' ? undefined : shuffle(mistake
      ? [item.answer, ...item.wrong.filter(value => value !== wrong).slice(0, 2)].map(replacement)
      : choices, random),
    acceptableAnswers: type === 'fill_blank' ? item.answer.includes('/') ? item.answer.split('/') : ({
      "isn't": ['is not'], "aren't": ['are not'], "don't": ['do not'], "doesn't": ['does not'],
      "can't": ['cannot', 'can not'], "mustn't": ['must not'], "weren't": ['were not'],
      "don't have to": ['do not have to'], '—': ['-', 'нет артикля'],
    } as Record<string, string[]>)[item.answer] : undefined,
    explanation: `${item.explanation} Верный вариант: ${item.sentence.replace('___', item.answer === '—' ? '' : item.answer).trim()}`,
    hint: item.cue,
  };
}

/** Recent scenes are excluded; key vocabulary is unique within each 21-question set. */
export function generateLocalGrammarExercises(lectureId: string, random: () => number = Math.random, options: { onlyType?: GrammarExerciseType; excludeIds?: string[] } = {}) {
  const entirePool = buildPracticePool(lectureId);
  const excluded = new Set((options.excludeIds || []).map(id => id.slice(id.indexOf(':') + 1)));
  const excludedVocabulary = new Set(entirePool.filter(item => excluded.has(item.key)).map(item => item.vocabulary));
  const pool = entirePool.filter(item => !excludedVocabulary.has(item.vocabulary));
  const count = options.onlyType ? GRAMMAR_SET_SIZE : GRAMMAR_SET_SIZE * 3;
  if (new Set(pool.map(item => item.vocabulary)).size < count) throw new Error('Для этой лекции пока недостаточно языкового материала.');
  const history = readHistory();
  const previous = history[lectureId] || { seen: [], recentVocabulary: [] };
  const seen = new Set(previous.seen);
  const recentVocabulary = new Set(previous.recentVocabulary);
  const chosen: PracticeItem[] = [];
  const usedVocabulary = new Set<string>();
  const rules = new Map<string, number>();
  let recycled = false;
  for (let index = 0; index < count; index++) {
    if (index % GRAMMAR_SET_SIZE === 0) rules.clear();
    const eligible = pool.filter(item => !usedVocabulary.has(item.vocabulary) && !previous.seen.slice(-21).includes(item.key));
    if (!eligible.length) throw new Error("Не удалось подобрать свежие задания. Вернитесь к лекции и создайте полный набор.");
    const fresh = eligible.filter(item => !seen.has(item.key));
    const candidates = shuffle(fresh.length ? fresh : eligible, random);
    if (!fresh.length) recycled = true;
    const penalty = (item: PracticeItem) => (rules.get(item.rule) || 0) * 4 + (recentVocabulary.has(item.vocabulary) ? 1 : 0);
    // If a rotation is exhausted, prefer the least recently seen scene.
    if (!fresh.length) candidates.sort((a, b) => previous.seen.indexOf(a.key) - previous.seen.indexOf(b.key));
    candidates.sort((a, b) => penalty(a) - penalty(b));
    const selected = candidates[0];
    chosen.push(selected);
    usedVocabulary.add(selected.vocabulary);
    rules.set(selected.rule, (rules.get(selected.rule) || 0) + 1);
  }
  const keys = chosen.map(item => item.key);
  history[lectureId] = {
    seen: [...previous.seen.filter(key => !keys.includes(key)), ...keys].slice(-Math.max(21, entirePool.length - 21)),
    recentVocabulary: [...new Set([...previous.recentVocabulary, ...usedVocabulary])].slice(-21),
  };
  memory = history;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* Session history survives. */ }
  return {
    multipleChoice: (options.onlyType ? options.onlyType === 'multiple_choice' ? chosen : [] : chosen.slice(0, 7)).map(item => toExercise(item, 'multiple_choice', random)),
    fillBlank: (options.onlyType ? options.onlyType === 'fill_blank' ? chosen : [] : chosen.slice(7, 14)).map(item => toExercise(item, 'fill_blank', random)),
    findMistake: (options.onlyType ? options.onlyType === 'find_mistake' ? chosen : [] : chosen.slice(14)).map(item => toExercise(item, 'find_mistake', random)),
    recycled,
  };
}
