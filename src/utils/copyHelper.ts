import type { QuestionResult, CachedWordData } from '../types';

export type CopyFormatType = 'original' | 'comma' | 'rich_markdown' | 'lines';

export interface CopyWordsOptions {
  results: QuestionResult[];
  sourceType: 'vocab_bank' | 'custom_input';
  originalInputText?: string;
  currentWordsData?: CachedWordData[];
  mistakesOnly?: boolean;
}

/**
 * Extracts the core english word from a formatted line for matching.
 */
function extractEnglishFromLine(line: string): string {
  // Pattern 1: 1. **||word||** - trans OR **word** - trans OR ||word|| - trans
  const structuredMatch = line.match(/(?:\*\*\|\||\|\|\*\*|\|\||\*\*)([^\*\|]+)(?:\*\*\|\||\|\|\*\*|\|\||\*\*)/i);
  if (structuredMatch && structuredMatch[1]) {
    return structuredMatch[1].trim().toLowerCase();
  }

  // Pattern 2: 1. word - translation OR word - translation
  const dashMatch = line.match(/^(?:\d+[\.\)]\s*)?([a-zA-Z\s\-\'\’]+)\s*(?:[–—\-\:]|->)\s*(.+)$/i);
  if (dashMatch && dashMatch[1]) {
    return dashMatch[1].trim().toLowerCase();
  }

  // Fallback: clean string
  return line.replace(/^[\d+\.\)\s\-*|]+/, '').replace(/[*|]/g, '').trim().toLowerCase();
}

/**
 * Formats test words for copying according to the test source and original format.
 */
export function formatWordsForCopy({
  results,
  sourceType,
  originalInputText = '',
  currentWordsData = [],
  mistakesOnly = false,
}: CopyWordsOptions): { text: string; count: number } {
  const targetResults = mistakesOnly ? results.filter(r => !r.isCorrect) : results;
  const count = targetResults.length;

  if (count === 0) {
    return { text: '', count: 0 };
  }

  const targetEnglishSet = new Set(targetResults.map(r => r.question.originalWord.toLowerCase().trim()));

  // 1. If test was from Personal Vocabulary Bank -> Comma-separated list
  if (sourceType === 'vocab_bank') {
    const list = targetResults.map(r => r.question.originalWord).join(', ');
    return { text: list, count };
  }

  // 2. If test was from Custom Input -> Preserve original format
  const cleanInput = originalInputText.trim();
  if (!cleanInput) {
    const list = targetResults.map(r => r.question.originalWord).join(', ');
    return { text: list, count };
  }

  // If user wants ALL words and it was custom input, return exact original input text
  if (!mistakesOnly) {
    return { text: cleanInput, count };
  }

  // If user wants ONLY MISTAKES from custom input:
  const lines = cleanInput.split('\n');
  const isNumbered = lines.some(l => /^\s*\d+[\.\)]\s*/.test(l));
  const isCommaSeparated = !cleanInput.includes('\n') && cleanInput.includes(',');

  if (isCommaSeparated) {
    // Original was comma separated: "word1, word2, word3"
    const words = cleanInput
      .split(/[,;]+/)
      .map(w => w.trim())
      .filter(w => targetEnglishSet.has(w.toLowerCase().trim()));
    return { text: words.join(', '), count: words.length };
  }

  // Multi-line list (structured or plain lines)
  const matchedLines: string[] = [];
  let sequentialNumber = 1;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) continue;

    const extractedWord = extractEnglishFromLine(trimmedLine);
    if (targetEnglishSet.has(extractedWord)) {
      if (isNumbered) {
        // Preserve line styling but renumber sequentially: 1. ..., 2. ...
        const lineWithoutNumber = trimmedLine.replace(/^\s*\d+[\.\)]\s*/, '');
        matchedLines.push(`${sequentialNumber}. ${lineWithoutNumber}`);
        sequentialNumber++;
      } else {
        matchedLines.push(trimmedLine);
      }
    }
  }

  if (matchedLines.length > 0) {
    return { text: matchedLines.join('\n'), count: matchedLines.length };
  }

  // Fallback if line matching didn't catch: format using result questions
  const fallbackLines = targetResults.map((r, idx) => {
    const wordData = currentWordsData.find(w => w.english.toLowerCase() === r.question.originalWord.toLowerCase());
    const trans = wordData?.disambiguationHint || r.question.russianWord || '';
    if (trans) {
      return isNumbered ? `${idx + 1}. **||${r.question.originalWord}||** – ${trans}` : `**||${r.question.originalWord}||** – ${trans}`;
    }
    return r.question.originalWord;
  });

  return { text: fallbackLines.join('\n'), count: fallbackLines.length };
}

/**
 * Quick export helpers for specific format requests.
 */
export function formatWordsAsCommaList(results: QuestionResult[], mistakesOnly = false): string {
  const target = mistakesOnly ? results.filter(r => !r.isCorrect) : results;
  return target.map(r => r.question.originalWord).join(', ');
}

export function formatWordsAsRichMarkdown(
  results: QuestionResult[],
  currentWordsData: CachedWordData[] = [],
  mistakesOnly = false
): string {
  const target = mistakesOnly ? results.filter(r => !r.isCorrect) : results;
  return target.map((r, idx) => {
    const wordData = currentWordsData.find(w => w.english.toLowerCase() === r.question.originalWord.toLowerCase());
    const trans = wordData?.disambiguationHint || r.question.russianWord || '';
    return `${idx + 1}. **||${r.question.originalWord}||** – ${trans}`;
  }).join('\n');
}
