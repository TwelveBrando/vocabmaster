import type { CachedWordData, CEFRLevel } from '../types';
import { KNOWN_RUSSIAN_SYNONYMS, expandRussianGrammarVariants } from './synonymHelper';
import { getSmartFallbackDistractors } from './distractorPool';
import { calculateCEFRFromFrequency } from './dictionaryEngine';
import { CEFR_DICTIONARY } from '../data/cefrDictionary';

export interface ParsedInputResult {
  isFormattedWithTranslations: boolean;
  wordsData: CachedWordData[];
  rawWords: string[];
}

/**
 * Normalizes text for comparison:
 * - lowercase
 * - replaces 'ё' with 'е'
 * - strips all punctuation
 * - collapses multiple spaces
 */
export function normalizeAnswer(str: string): string {
  return str
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an exhaustive list of acceptable Russian answer variants from a definition string.
 * Example input: "сломаться (о машине, приборе); расплакаться"
 */
export function generateAcceptableRussianVariants(fullRussianDef: string, englishWord?: string): string[] {
  const variants = new Set<string>();
  const trimmed = fullRussianDef.trim();
  if (!trimmed) return [];

  variants.add(trimmed);

  if (englishWord) {
    const known = KNOWN_RUSSIAN_SYNONYMS[englishWord.toLowerCase().trim()];
    if (known) {
      known.forEach(k => variants.add(k));
    }
  }

  // 1. Clean without any parentheses: "сломаться (о машине) -> сломаться"
  const withoutParentheses = trimmed.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (withoutParentheses) {
    variants.add(withoutParentheses);
  }

  // 2. Text inside parentheses as context variants
  const withParenthesesTextOnly = trimmed.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (withParenthesesTextOnly) {
    variants.add(withParenthesesTextOnly);
  }

  // 3. Split by semicolons, commas, slashes
  const chunks = [
    trimmed,
    withoutParentheses,
    withParenthesesTextOnly,
  ];

  for (const chunk of chunks) {
    const parts = chunk.split(/[;,/]+/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      variants.add(part);

      const cleanPart = part.replace(/\([^)]*\)/g, '').trim();
      if (cleanPart) {
        variants.add(cleanPart);
      }

      // Add grammatical/aspectual variants for each part
      const grammarVariants = expandRussianGrammarVariants(cleanPart);
      grammarVariants.forEach(gv => variants.add(gv));
    }
  }

  return Array.from(variants).filter(Boolean);
}

/**
 * Extract clean Russian word and context hint from string
 */
export function extractRussianComponents(rawRussian: string): {
  baseWord: string;
  hint: string;
  fullDescription: string;
} {
  const fullDescription = rawRussian.trim();
  
  const parenMatches = Array.from(fullDescription.matchAll(/\(([^)]+)\)/g)).map(m => m[1]);
  
  const baseWithoutParens = fullDescription
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (parenMatches.length > 0) {
    const hint = `(${parenMatches.join('; ')})`;
    return {
      baseWord: baseWithoutParens || fullDescription,
      hint,
      fullDescription,
    };
  }

  return {
    baseWord: fullDescription,
    hint: '',
    fullDescription,
  };
}

/**
 * Determines the CEFR level for a given English word
 */
export function determineWordCEFRLevel(englishWord: string): CEFRLevel {
  const norm = englishWord.toLowerCase().trim().replace(/^to\s+/, '');
  const builtIn = CEFR_DICTIONARY.find(d => d.word.toLowerCase() === norm || d.word.toLowerCase() === englishWord.toLowerCase().trim());
  if (builtIn) return builtIn.level;

  // Common ultra-basic pronouns and function words
  const a1Words = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'be', 'have', 'do', 'what', 'where', 'who', 'when', 'why', 'how', 'house', 'water', 'eat', 'go', 'see', 'good', 'bad', 'yes', 'no']);
  if (a1Words.has(norm)) return 'A1';

  return calculateCEFRFromFrequency();
}

/**
 * Main parser supporting markdown bracket format, pipes, standard bold format, and raw words
 */
export function parseVocabularyInput(input: string): ParsedInputResult {
  // Normalize non-breaking spaces and linebreaks
  const cleanInput = input.replace(/\u00A0/g, ' ');
  const lines = cleanInput.split('\n').map(l => l.trim()).filter(Boolean);
  const formattedItems: CachedWordData[] = [];
  const rawWords: string[] = [];

  // Regex patterns:
  // 1. Markdown with double pipes/stars: 1. **||word||** – translation OR 1. **word** – translation
  const structuredLineRegex = /^(?:\d+[\.\)]\s*)?(?:\*\*\|\||\|\|\*\*|\|\||\*\*)([^\*\|]+)(?:\*\*\|\||\|\|\*\*|\|\||\*\*)\s*(?:[–—\-\:]|->)\s*(.+)$/i;
  // 2. Standard english dash russian: 1. word – translation
  const standardDashRegex = /^(?:\d+[\.\)]\s*)?([a-zA-Z\s\-\'\’]+)\s*(?:[–—\-\:]|->)\s*(.+)$/i;

  let hasFormattedLines = false;

  for (const line of lines) {
    let match = line.match(structuredLineRegex);
    if (!match) {
      match = line.match(standardDashRegex);
    }

    if (match) {
      const english = match[1].trim();
      const rawRussian = match[2].trim();

      if (english && rawRussian) {
        hasFormattedLines = true;
        const { baseWord, fullDescription } = extractRussianComponents(rawRussian);
        const acceptableRussian = generateAcceptableRussianVariants(fullDescription, english);
        const level = determineWordCEFRLevel(english);

        // Smart deceptive distractors
        const smartDistractors = getSmartFallbackDistractors(baseWord, 6, english);

        formattedItems.push({
          english,
          russian: baseWord,
          disambiguationHint: fullDescription,
          distractors: smartDistractors,
          acceptableRussian,
          acceptableEnglish: [english.toLowerCase().trim()],
          contextSource: fullDescription !== baseWord ? 'provided' : 'fallback',
          level,
          timestamp: Date.now(),
        });
        rawWords.push(english);
      }
    }
  }

  // If no structured lines were found, treat as comma-separated or newline-separated word list
  if (!hasFormattedLines || formattedItems.length === 0) {
    const splitWords = cleanInput
      .split(/[,;\n]+/)
      .map(w => w.trim().replace(/^[\d+\.\)\s\-*|]+/, '').replace(/[*|]/g, '').trim())
      .filter(w => w.length > 0 && /^[a-zA-Z\s\-\'\’]+$/.test(w));

    return {
      isFormattedWithTranslations: false,
      wordsData: [],
      rawWords: Array.from(new Set(splitWords)),
    };
  }

  return {
    isFormattedWithTranslations: true,
    wordsData: formattedItems,
    rawWords,
  };
}
