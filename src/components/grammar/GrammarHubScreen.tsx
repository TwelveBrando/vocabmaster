import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Layers, 
  Users, 
  Compass, 
  Box, 
  ShieldAlert, 
  History,
  Search,
  Award,
  BookMarked
} from 'lucide-react';
import type { UITheme, AISettings } from '../../types';
import type { GrammarTopic, GrammarSubtopic } from '../../types/grammar';
import { grammarService } from '../../services/grammarService';
import { THEMES } from '../../styles/themes';

interface GrammarHubScreenProps {
  currentTheme: UITheme;
  settings: AISettings;
  onSelectSubtopic: (subtopicId: string) => void;
}

export const GrammarHubScreen: React.FC<GrammarHubScreenProps> = ({
  currentTheme,
  onSelectSubtopic,
}) => {
  const theme = THEMES[currentTheme] || THEMES.cyber_oasis;
  const topics = grammarService.getA1Topics();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopicId, setExpandedTopicId] = useState<string>(topics[0]?.id || '');
  const [progress] = useState(() => grammarService.getUserProgress());

  // Icon mapping
  const getTopicIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'Clock': return <Clock className="w-5 h-5 text-sky-400" />;
      case 'Layers': return <Layers className="w-5 h-5 text-emerald-400" />;
      case 'Users': return <Users className="w-5 h-5 text-indigo-400" />;
      case 'Compass': return <Compass className="w-5 h-5 text-rose-400" />;
      case 'Box': return <Box className="w-5 h-5 text-cyan-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-orange-400" />;
      case 'History': return <History className="w-5 h-5 text-fuchsia-400" />;
      default: return <BookOpen className="w-5 h-5 text-cyan-400" />;
    }
  };

  const totalSubtopics = topics.reduce((acc, t) => acc + t.subtopics.length, 0);
  const completedCount = progress.completedSubtopics.length;
  const progressPercent = Math.round((completedCount / totalSubtopics) * 100) || 0;

  // Filter topics and subtopics based on search
  const filteredTopics = topics.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchTopic = t.title.toLowerCase().includes(q) || t.titleRussian.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    const matchSubtopics = t.subtopics.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    return matchTopic || matchSubtopics;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-col gap-6 h-full flex-1 min-h-0 overflow-y-auto select-none animate-fadeIn relative z-10">
      {/* Top Banner: Level A1 & Progress Hub */}
      <div className={`${theme.cardBg} ${theme.cardBorder} rounded-3xl p-5 sm:p-8 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 sm:gap-6 shadow-xl backdrop-blur-2xl transition-all relative overflow-hidden shrink-0`}>
        {/* Glow effect */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 sm:gap-5 relative z-10">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
            theme.isLight 
              ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white'
              : 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/25'
          }`}>
            <BookMarked className="w-8 h-8" strokeWidth={1.7} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-xs uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-md border ${
                theme.isLight 
                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                  : 'bg-amber-950/35 text-amber-200 border-amber-400/25'
              }`}>
                Уровень A1 • Elementary
              </span>
              <span className={`text-xs font-bold ${theme.textMuted}`}>
                8 тем • 25 лекций
              </span>
            </div>

            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${theme.textPrimary}`}>
              Грамматика и Интерактивные Лекции
            </h1>

            <p className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${theme.textSecondary}`}>
              Понятные объяснения на пальцах, структурированные формулы, разбор подводных камней и три упражнения по семь заданий после каждой лекции. Новые наборы доступны без ключей и ожидания.
            </p>
          </div>
        </div>

        {/* Progress Card */}
        <div className={`w-full xl:w-72 p-4 rounded-2xl border shrink-0 flex flex-col gap-2.5 relative z-10 ${
          theme.isLight ? 'bg-white/80 border-slate-200/80 shadow-sm' : 'bg-black/20 border-white/10'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={`flex items-center gap-1.5 ${theme.textPrimary}`}>
              <Award className="w-4 h-4 text-amber-500" />
              Прогресс A1
            </span>
            <span className={theme.accentText}>{progressPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden relative">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                theme.isLight ? 'bg-gradient-to-r from-cyan-500 to-indigo-600' : 'bg-gradient-to-r from-cyan-400 to-indigo-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Пройдено {completedCount} из {totalSubtopics} лекций</span>
            <span>{totalSubtopics - completedCount} осталось</span>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <input
          type="text"
          name="grammar-search"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по грамматическим темам (например: To Be, Present Simple, Артикли, Some/Any)..."
          className={`w-full pl-11 pr-4 py-3.5 rounded-2xl ${theme.cardBg} ${theme.cardBorder} ${theme.inputText} ${theme.inputPlaceholder} text-sm focus:outline-none ${theme.inputFocus} transition-all shadow-sm backdrop-blur-xl`}
        />
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Очистить
          </button>
        )}
      </div>

      {/* Table of Contents: Topics List */}
      <div className="flex flex-col gap-4 pb-10">
        {filteredTopics.map((topic: GrammarTopic) => {
          const isExpanded = expandedTopicId === topic.id || !!searchQuery;
          const completedInTopic = topic.subtopics.filter(s => progress.completedSubtopics.includes(s.id)).length;

          return (
            <div
              key={topic.id}
              className={`${theme.cardBg} ${theme.cardBorder} rounded-3xl overflow-hidden transition-all shadow-sm hover:shadow-md backdrop-blur-xl`}
            >
              {/* Topic Header Card (Click to expand) */}
              <div
                onClick={() => setExpandedTopicId(isExpanded ? '' : topic.id)}
                className={`p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                  theme.isLight ? 'hover:bg-slate-50/70' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    theme.isLight 
                      ? 'bg-white border-slate-200 text-slate-900 shadow-xs' 
                      : 'bg-white/[0.06] border-white/10 text-white'
                  }`}>
                    {getTopicIcon(topic.iconName)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md ${
                        theme.isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/10 text-slate-300'
                      }`}>
                        Тема {topic.number}
                      </span>
                      <span className={`text-[10px] font-bold ${theme.accentText}`}>
                        {topic.badge}
                      </span>
                    </div>

                    <h2 className={`text-lg sm:text-xl font-black mt-1 leading-snug ${theme.textPrimary}`}>
                      {topic.titleRussian}
                    </h2>

                    <p className={`text-xs text-slate-400 mt-0.5 hidden sm:block line-clamp-1`}>
                      {topic.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-bold text-slate-400">
                      {completedInTopic} / {topic.subtopics.length} готово
                    </span>
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
                    isExpanded ? 'rotate-90' : ''
                  } ${theme.isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'}`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Subtopics Accordion Content */}
              {isExpanded && (
                <div className={`border-t p-4 sm:p-5 flex flex-col gap-2.5 ${
                  theme.isLight ? 'border-slate-200/60 bg-slate-50/50' : 'border-white/[0.06] bg-black/15'
                }`}>
                  {topic.subtopics.map((subtopic: GrammarSubtopic, sIdx: number) => {
                    const isCompleted = progress.completedSubtopics.includes(subtopic.id);
                    const exerciseStats = progress.passedExercises[subtopic.id];

                    return (
                      <div
                        key={subtopic.id}
                        onClick={() => onSelectSubtopic(subtopic.id)}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                          isCompleted
                            ? theme.isLight
                              ? 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/60'
                              : 'bg-emerald-950/20 border-emerald-500/25 hover:bg-emerald-950/30'
                            : theme.isLight
                            ? 'bg-white hover:bg-slate-100 border-slate-200/80 shadow-2xs'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : (
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                theme.isLight ? 'border-slate-300 text-slate-500' : 'border-white/20 text-slate-400'
                              }`}>
                                {sIdx + 1}
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className={`text-sm font-extrabold group-hover:${theme.accentText} transition-colors ${
                              isCompleted ? 'text-emerald-900 dark:text-emerald-300' : theme.textPrimary
                            }`}>
                              {subtopic.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {subtopic.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:self-center shrink-0 ml-8 sm:ml-0">
                          <span className={`text-[11px] font-medium flex items-center gap-1 text-slate-400`}>
                            <Clock className="w-3 h-3" />
                            {subtopic.readTimeMinutes} мин
                          </span>

                          {exerciseStats && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Тест: {exerciseStats.totalScore}/{exerciseStats.maxPossible}
                            </span>
                          )}

                          <button
                            type="button"
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                              theme.primaryButton
                            }`}
                          >
                            <span>Читать</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredTopics.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">Ничего не найдено по запросу «{searchQuery}»</p>
          </div>
        )}
      </div>
    </div>
  );
};
