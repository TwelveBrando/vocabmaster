import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, ListOrdered, Sparkles, RotateCcw } from 'lucide-react';
import type { UITheme, DictionaryEntry } from '../types';
import { THEMES } from '../styles/themes';
import { parseVocabularyInput } from '../services/wordParser';
import { CEFR_LEVELS_META } from '../data/cefrDictionary';

interface ImportWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (entries: DictionaryEntry[]) => void;
  currentTheme: UITheme;
}

const EXAMPLE_IMPORT_TEXT = `1. **I** – я
2. **you** – ты, вы
3. **he** – он
4. **to be** – быть, находиться (am/is/are)
5. **to have** – иметь
6. **to do** – делать
7. **what** – что, какой
8. **where** – где, куда
9. **house** – дом
10. **water** – вода
11. **eat** – есть (принимать пищу)
12. **go** – идти, ехать
13. **she** – она
14. **it** – оно
15. **we** – мы`;

export const ImportWordsModal: React.FC<ImportWordsModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentTheme,
}) => {
  const [text, setText] = useState('');
  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;

  if (!isOpen) return null;

  const parsed = parseVocabularyInput(text);
  const recognizedItems = parsed.wordsData;
  const count = recognizedItems.length;

  const handleConfirmImport = () => {
    if (count === 0) return;

    const entries: DictionaryEntry[] = recognizedItems.map(item => ({
      id: `imp_${item.english}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: item.english,
      level: item.level || 'A1',
      partOfSpeech: item.partOfSpeech || 'word',
      russian: item.russian,
      disambiguationHint: item.disambiguationHint,
      isCustom: true,
    }));

    onImport(entries);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Surface */}
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-xl overflow-hidden flex flex-col max-h-[85vh] transition-all z-10 ${theme.modalBg} ${theme.cardBorder}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme.modalHeaderBg} ${theme.cardBorder}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-base font-bold tracking-tight ${theme.textPrimary}`}>
                Импорт списка слов
              </h3>
              <p className={`text-xs ${theme.textSecondary}`}>
                Вставьте список с переводом через тире или markdown
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer ${
              theme.isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 flex-1">
          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
              Текст списка
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setText(EXAMPLE_IMPORT_TEXT)}
                className={`px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  theme.isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-200'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                Вставить пример
              </button>
              {text && (
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="1. **I** – я&#10;2. **you** – ты, вы&#10;3. **to be** – быть, находиться (am/is/are)..."
              className={`w-full px-4 py-3 rounded-xl ${theme.inputBg} ${theme.cardBorder} ${theme.inputText} ${theme.inputPlaceholder} text-sm focus:outline-none ${theme.inputFocus} transition-all leading-relaxed resize-none shadow-inner`}
            />
          </div>

          {/* Real-time Recognition Preview */}
          {count > 0 && (
            <div className={`p-4 rounded-xl border-2 flex flex-col gap-2.5 animate-fadeIn ${
              theme.isLight ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-950/20 border-emerald-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5 text-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                  Распознано: <strong>{count} слов</strong>
                </span>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-bold">
                  CEFR-уровни определены
                </span>
              </div>

              {/* Word preview pills grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {recognizedItems.map((item, idx) => {
                  const level = item.level || 'A1';
                  const levelMeta = CEFR_LEVELS_META[level] || CEFR_LEVELS_META.A1;

                  return (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-xs shadow-2xs ${
                        theme.isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-bold truncate ${theme.textPrimary}`}>
                          {item.english}
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${levelMeta.badgeClass}`}>
                          {level}
                        </span>
                      </div>
                      <span className={`truncate text-[11px] font-medium ${theme.textSecondary}`}>
                        {item.disambiguationHint || item.russian}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between gap-3 ${theme.modalFooterBg} ${theme.cardBorder}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
              theme.isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Отмена
          </button>

          <button
            type="button"
            disabled={count === 0}
            onClick={handleConfirmImport}
            className={`px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98 ${
              count === 0
                ? 'opacity-40 cursor-not-allowed bg-slate-300 text-slate-500'
                : `${theme.primaryButton}`
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Добавить ({count} слов) в запас</span>
          </button>
        </div>
      </div>
    </div>
  );
};
