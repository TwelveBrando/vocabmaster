import type { CachedWordData, TestMode, TestQuestion } from '../types';
import { generateAcceptableRussianVariants } from './wordParser';
import { getSmartFallbackDistractors } from './distractorPool';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildTestQuestions(
  wordsData: CachedWordData[],
  mode: TestMode,
  numOptions: number = 4
): TestQuestion[] {
  const questions: TestQuestion[] = [];
  const shuffledWords = shuffleArray(wordsData);

  for (const item of shuffledWords) {
    // Generate full set of acceptable Russian synonyms
    const acceptableRussian = Array.from(new Set([
      ...(item.acceptableRussian || []),
      ...generateAcceptableRussianVariants(item.russian, item.english),
      ...generateAcceptableRussianVariants(item.disambiguationHint || '', item.english),
    ])).filter(Boolean);

    // Primary display for full Russian answer
    const displayRussianCorrect = item.disambiguationHint || item.russian;

    if (mode === 'mode1_choice') {
      const neededDistractorsCount = Math.max(1, Math.min(6, numOptions - 1));

      // Build dedicated pool of deceptive distractors for this word
      const pool = new Set<string>();
      
      // 1. Use item's specifically generated AI distractors
      if (Array.isArray(item.distractors)) {
        item.distractors.forEach(d => {
          const cleanD = d.trim();
          if (
            cleanD &&
            cleanD.toLowerCase() !== item.russian.toLowerCase() &&
            !acceptableRussian.some(ans => ans.toLowerCase() === cleanD.toLowerCase())
          ) {
            pool.add(cleanD);
          }
        });
      }

      // 2. If pool is still short, fill with smart deceptive distractors
      if (pool.size < neededDistractorsCount) {
        const fallbacks = getSmartFallbackDistractors(item.russian, 6, item.english);
        for (const fb of fallbacks) {
          if (
            fb.toLowerCase() !== item.russian.toLowerCase() &&
            !acceptableRussian.some(ans => ans.toLowerCase() === fb.toLowerCase())
          ) {
            pool.add(fb);
            if (pool.size >= neededDistractorsCount) break;
          }
        }
      }

      const selectedDistractors = shuffleArray(Array.from(pool)).slice(0, neededDistractorsCount);
      const allOptions = shuffleArray([item.russian, ...selectedDistractors]);

      questions.push({
        id: `q_${item.english}_${Math.random().toString(36).substring(2, 8)}`,
        originalWord: item.english,
        russianWord: item.russian,
        disambiguationHint: item.disambiguationHint,
        mode,
        options: allOptions,
        correctAnswer: item.russian,
        acceptableAnswers: acceptableRussian.length > 0 ? acceptableRussian : [item.russian],
      });
    } else if (mode === 'mode2_ru_to_en') {
      const acceptableEnglish = Array.from(new Set([
        item.english.toLowerCase().trim(),
        ...(item.acceptableEnglish || []).map(answer => answer.toLowerCase().trim()),
      ])).filter(Boolean);

      questions.push({
        id: `q_${item.english}_${Math.random().toString(36).substring(2, 8)}`,
        originalWord: item.english,
        russianWord: item.russian,
        disambiguationHint: item.disambiguationHint,
        mode,
        correctAnswer: item.english,
        acceptableAnswers: acceptableEnglish,
      });
    } else if (mode === 'mode3_en_to_ru') {
      questions.push({
        id: `q_${item.english}_${Math.random().toString(36).substring(2, 8)}`,
        originalWord: item.english,
        russianWord: item.russian,
        disambiguationHint: item.disambiguationHint,
        mode,
        correctAnswer: displayRussianCorrect,
        acceptableAnswers: acceptableRussian.length > 0 ? acceptableRussian : [item.russian],
      });
    }
  }

  return questions;
}
