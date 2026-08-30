import React from 'react';
import { 
  ArrowLeft, 
  Clock, 
  ChevronRight, 
  Volume2,
} from 'lucide-react';
import type { UITheme } from '../../types';
import type { GrammarLecture } from '../../types/grammar';
import { grammarService } from '../../services/grammarService';
import { THEMES } from '../../styles/themes';

interface GrammarLectureScreenProps {
  currentTheme: UITheme;
  lecture: GrammarLecture;
  onBackToHub: () => void;
  onNavigateToLecture: (subtopicId: string) => void;
}

export const GrammarLectureScreen: React.FC<GrammarLectureScreenProps> = ({
  currentTheme,
  lecture,
  onBackToHub,
  onNavigateToLecture,
}) => {
  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;

  // Audio pronunciation for English examples
  const speakEnglish = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentTopicInfo = grammarService.findTopicBySubtopicId(lecture.subtopicId);
  const nextSubtopic = currentTopicInfo?.topic.subtopics[currentTopicInfo.subtopicIndex + 1];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-10 py-6 flex flex-col gap-8 h-full flex-1 min-h-0 overflow-y-auto select-text animate-fadeIn relative z-10 pb-20 font-sans">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-4 select-none">
        <button
          type="button"
          onClick={onBackToHub}
          className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 ${
            theme.isLight
              ? 'bg-white/90 hover:bg-white text-slate-800 border-slate-300'
              : 'bg-white/[0.08] hover:bg-white/[0.14] text-slate-100 border-white/15'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>К оглавлению A1</span>
        </button>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium flex items-center gap-1.5 ${theme.textMuted}`}>
            <Clock className="w-3.5 h-3.5" />
            ~{lecture.readTimeMinutes} мин чтения
          </span>

        </div>
      </div>

      {/* Book Editorial Container */}
      <article className={`${theme.cardBg} ${theme.cardBorder} rounded-3xl p-6 sm:p-12 border shadow-xl backdrop-blur-2xl transition-all flex flex-col gap-8 leading-relaxed`}>
        {/* Book Header / Chapter Meta */}
        <header className="border-b pb-6 flex flex-col gap-2 border-slate-200/50 dark:border-white/10">
          <div className="flex items-center gap-2 select-none">
            <span className={`text-xs uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-md border ${theme.accentBadge}`}>
              {currentTopicInfo?.topic.titleRussian || 'Грамматика A1'}
            </span>
            <span className={`text-xs ${theme.textMuted}`}>• Уровень A1</span>
          </div>

          <h1 className={`text-2xl sm:text-4xl font-black tracking-tight mt-1 leading-tight ${theme.textPrimary}`}>
            {lecture.title}
          </h1>

          <p className={`text-base sm:text-lg font-medium mt-1 leading-relaxed opacity-90 ${theme.textSecondary}`}>
            {lecture.subtitle}
          </p>
        </header>

        {/* Book Sections / In-Depth Content */}
        <div className="flex flex-col gap-8 text-sm sm:text-base leading-relaxed font-normal">
          {lecture.contentSections && lecture.contentSections.map((sec, sIdx) => (
            <section key={sIdx} className="flex flex-col gap-4">
              {sec.title && (
                <h2 className={`text-lg sm:text-xl font-black tracking-tight mt-2 flex items-center gap-2.5 ${theme.textPrimary}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${theme.isLight ? 'bg-cyan-600' : 'bg-cyan-400'}`} />
                  {sec.title}
                </h2>
              )}

              {/* Paragraphs */}
              {sec.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className={`leading-relaxed text-[15px] sm:text-[16px] ${theme.textPrimary} opacity-95`}>
                  {p}
                </p>
              ))}

              {/* Editorial Callout */}
              {sec.callout && (
                <aside className={`my-2 p-5 sm:p-6 rounded-2xl border-l-4 border flex flex-col gap-2 shadow-xs ${
                  sec.callout.type === 'warning'
                    ? 'border-l-rose-500 bg-rose-500/10 border-rose-500/20'
                    : sec.callout.type === 'rule'
                    ? 'border-l-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    : 'border-l-cyan-500 bg-cyan-500/10 border-cyan-500/20'
                }`}>
                  {sec.callout.title && (
                    <div className={`text-xs font-black uppercase tracking-wider ${theme.textPrimary}`}>
                      {sec.callout.title}
                    </div>
                  )}
                  <p className={`text-sm sm:text-[15px] leading-relaxed font-medium ${theme.textPrimary} opacity-95`}>
                    {sec.callout.text}
                  </p>
                </aside>
              )}

              {/* Data / Paradigm Table */}
              {sec.table && (
                <div className="overflow-x-auto my-2">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse rounded-xl overflow-hidden border border-slate-300/60 dark:border-white/15">
                    <thead>
                      <tr className={theme.isLight ? 'bg-black/[0.04] border-b border-slate-300' : 'bg-white/[0.08] border-b border-white/10'}>
                        {sec.table.headers.map((h, hIdx) => (
                          <th key={hIdx} className={`p-3 sm:p-3.5 font-black uppercase tracking-wider text-[11px] ${theme.textPrimary}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-white/10 font-mono">
                      {sec.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={theme.isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.04]'}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className={`p-3 sm:p-3.5 font-medium ${theme.textPrimary} opacity-90`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Context Examples */}
              {sec.examples && sec.examples.length > 0 && (
                <div className="flex flex-col gap-2.5 my-2">
                  {sec.examples.map((ex, eIdx) => (
                    <div
                      key={eIdx}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-3 shadow-xs ${
                        theme.isLight ? 'bg-black/[0.02] border-slate-200/80' : 'bg-white/[0.04] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className={`font-bold text-[15px] ${theme.textPrimary}`}>
                          {ex.english}
                        </div>
                        <div className={`text-xs sm:text-sm ${theme.textSecondary}`}>
                          {ex.russian}
                        </div>
                        {ex.note && (
                          <div className={`text-xs font-medium mt-1 ${theme.accentText}`}>
                            {ex.note}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => speakEnglish(ex.english)}
                        title="Прослушать произношение"
                        className={`p-2 rounded-lg border shrink-0 transition-colors cursor-pointer select-none ${
                          theme.isLight ? 'hover:bg-slate-200 text-slate-700 border-slate-300' : 'hover:bg-white/15 text-slate-200 border-white/15'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Lecture Footer & Exercises Trigger */}
        <footer className="border-t pt-8 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 select-none border-slate-200/50 dark:border-white/10">
          <button
            type="button"
            onClick={onBackToHub}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              theme.isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/15'
            }`}
          >
            ← Вернуться к списку тем
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {nextSubtopic && (
              <button
                type="button"
                onClick={() => onNavigateToLecture(nextSubtopic.id)}
                className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                  theme.isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/15'
                }`}
              >
                <span>След. лекция</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>
      </article>
    </div>
  );
};
