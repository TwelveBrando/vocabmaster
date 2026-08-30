import { CEFR_DICTIONARY } from '../data/cefrDictionary';

const BASE_WORDS_MAP = new Map<string, string>();
for (const item of CEFR_DICTIONARY) {
  BASE_WORDS_MAP.set(item.word.toLowerCase(), item.russian);
}

/**
 * Smart morphological translation engine for English derivatives:
 * -able/-ible, -less, -ness, -ly, -er/-or, -ing, -ed, -ment, -tion, un-, in-, dis-, re-
 */
export function translateViaMorphology(word: string): string | null {
  const w = word.toLowerCase().trim();

  // 1. Direct match in base dictionary
  if (BASE_WORDS_MAP.has(w)) {
    return BASE_WORDS_MAP.get(w)!;
  }

  // 2. Prefixes: un-, dis-, re-, in-, im-
  if (w.startsWith('un') && w.length > 4) {
    const stem = w.slice(2);
    const stemTrans = BASE_WORDS_MAP.get(stem) || translateViaMorphology(stem);
    if (stemTrans) {
      if (stem.endsWith('ed') || stem.endsWith('able')) return `не${stemTrans}`;
      return `не ${stemTrans}`;
    }
  }

  if (w.startsWith('re') && w.length > 4) {
    const stem = w.slice(2);
    const stemTrans = BASE_WORDS_MAP.get(stem);
    if (stemTrans) {
      return `пере${stemTrans} / повторно ${stemTrans}`;
    }
  }

  // 3. Suffixes: -less (безответный, бессмысленный)
  if (w.endsWith('less') && w.length > 5) {
    const stem = w.slice(0, -4);
    const stemTrans = BASE_WORDS_MAP.get(stem) || BASE_WORDS_MAP.get(`${stem}e`);
    if (stemTrans) {
      const cleanStem = stemTrans.split(/[,;(]/)[0].trim();
      return `лишенный (${cleanStem}) / без ${cleanStem}`;
    }
  }

  // 4. Suffixes: -able / -ible (подлежащий ответу, способный к...)
  if ((w.endsWith('able') || w.endsWith('ible')) && w.length > 5) {
    const stem = w.slice(0, 4 === 4 ? -4 : -4);
    const stemTrans = BASE_WORDS_MAP.get(stem) || BASE_WORDS_MAP.get(`${stem}e`);
    if (stemTrans) {
      const cleanStem = stemTrans.split(/[,;(]/)[0].trim();
      return `подлежащий (${cleanStem}) / доступный для (${cleanStem})`;
    }
  }

  // 5. Suffixes: -ly (наречие)
  if (w.endsWith('ly') && w.length > 4) {
    const stem = w.slice(0, -2);
    const stemTrans = BASE_WORDS_MAP.get(stem) || BASE_WORDS_MAP.get(`${stem}e`);
    if (stemTrans) {
      const cleanStem = stemTrans.split(/[,;(]/)[0].trim();
      return `в манере (${cleanStem}) / соответствующим образом`;
    }
  }

  // 6. Suffixes: -er / -or (деятель/субъект)
  if ((w.endsWith('er') || w.endsWith('or')) && w.length > 4) {
    const stem = w.endsWith('er') ? w.slice(0, -2) : w.slice(0, -2);
    const stemTrans = BASE_WORDS_MAP.get(stem) || BASE_WORDS_MAP.get(`${stem}e`);
    if (stemTrans) {
      const cleanStem = stemTrans.split(/[,;(]/)[0].trim();
      return `тот, кто осуществляет (${cleanStem})`;
    }
  }

  // 7. Suffixes: -ness (состояние/качество)
  if (w.endsWith('ness') && w.length > 5) {
    const stem = w.slice(0, -4);
    const stemTrans = BASE_WORDS_MAP.get(stem) || BASE_WORDS_MAP.get(`${stem}e`);
    if (stemTrans) {
      const cleanStem = stemTrans.split(/[,;(]/)[0].trim();
      return `свойство / состояние (${cleanStem})`;
    }
  }

  // 8. Suffixes: -ed / -ing
  if (w.endsWith('ed') && w.length > 4) {
    const stem = w.slice(0, -2);
    const stemTrans = BASE_WORDS_MAP.get(stem) || BASE_WORDS_MAP.get(`${stem}e`);
    if (stemTrans) {
      const cleanStem = stemTrans.split(/[,;(]/)[0].trim();
      return `завершенный (${cleanStem})`;
    }
  }

  if (w.endsWith('ing') && w.length > 4) {
    const stem = w.slice(0, -3);
    const stemTrans = BASE_WORDS_MAP.get(stem) || BASE_WORDS_MAP.get(`${stem}e`);
    if (stemTrans) {
      const cleanStem = stemTrans.split(/[,;(]/)[0].trim();
      return `процесс (${cleanStem}) / совершающий (${cleanStem})`;
    }
  }

  // 9. Plural -s / -es
  if (w.endsWith('s') && w.length > 3) {
    const stem = w.endsWith('es') ? w.slice(0, -2) : w.slice(0, -1);
    const stemTrans = BASE_WORDS_MAP.get(stem) || BASE_WORDS_MAP.get(`${stem}e`);
    if (stemTrans) {
      return stemTrans;
    }
  }

  return null;
}
