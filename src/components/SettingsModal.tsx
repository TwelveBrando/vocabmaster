import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Key, Cpu, Palette, Settings2, Sliders, CheckCircle2, Eye, EyeOff, Check, AlertCircle, Languages } from 'lucide-react';
import type { AISettings, UITheme, AIProvider } from '../types';
import { cacheService } from '../services/cacheService';
import { settingsService } from '../services/settingsService';
import { THEMES } from '../styles/themes';
import { executeThemeTransition } from '../utils/themeTransition';
import { FlowButton } from './ui/flow-button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (settings: AISettings) => void;
  onCacheUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onCacheUpdated,
}) => {
  // Always load latest settings on open
  const [formData, setFormData] = useState<AISettings>(() => settingsService.getSettings());
  const [showKey, setShowKey] = useState(false);
  const [showYandexKey, setShowYandexKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [cacheClearMsg, setCacheClearMsg] = useState('');
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const yandexKeyInputRef = useRef<HTMLInputElement>(null);
  const apiKeyInteractedRef = useRef(false);
  const yandexKeyInteractedRef = useRef(false);
  const expectedApiKeyRef = useRef(formData.apiKey);
  const expectedYandexKeyRef = useRef(formData.yandexApiKey || '');

  useEffect(() => {
    expectedApiKeyRef.current = formData.apiKey;
    expectedYandexKeyRef.current = formData.yandexApiKey || '';
  }, [formData.apiKey, formData.yandexApiKey]);

  // Sync state whenever modal opens or settings update
  useEffect(() => {
    if (isOpen) {
      apiKeyInteractedRef.current = false;
      yandexKeyInteractedRef.current = false;
      const freshSettings = settingsService.getSettings();
      setFormData(freshSettings);
    }
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;

    const restoreSavedKeys = () => {
      if (!apiKeyInteractedRef.current && apiKeyInputRef.current) {
        apiKeyInputRef.current.value = expectedApiKeyRef.current;
      }
      if (!yandexKeyInteractedRef.current && yandexKeyInputRef.current) {
        yandexKeyInputRef.current.value = expectedYandexKeyRef.current;
      }
    };
    const timers = [0, 250, 1000].map(delay => window.setTimeout(restoreSavedKeys, delay));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [isOpen, formData.provider]);

  if (!isOpen) return null;

  const currentThemeConfig = THEMES[formData.theme] || THEMES.language_explorer;

  // Auto-save helper to guarantee no keys are ever lost
  const persistChanges = (updated: AISettings) => {
    setFormData(updated);
    settingsService.saveSettings(updated);
    onSave(updated);
  };

  const handleProviderChange = (newProvider: AIProvider) => {
    apiKeyInteractedRef.current = false;
    // 1. Sync current key
    const currentKeys = {
      ...(formData.apiKeys || {}),
      [formData.provider]: formData.apiKey,
    };

    // 2. Load key for selected provider
    const nextKey = currentKeys[newProvider] || '';

    // 3. Set default model for new provider if switching
    let nextModel = formData.model;
    if (newProvider === 'gemini') nextModel = 'gemini-3.5-flash-lite';
    if (newProvider === 'groq') nextModel = 'openai/gpt-oss-120b';
    if (newProvider === 'openrouter') nextModel = 'google/gemini-2.0-flash-exp:free';
    if (newProvider === 'custom') nextModel = 'gpt-4o-mini';

    const updated: AISettings = {
      ...formData,
      provider: newProvider,
      apiKey: nextKey,
      apiKeys: currentKeys,
      model: nextModel,
      baseUrl: newProvider === 'custom' ? formData.baseUrl || 'http://localhost:11434/v1' : formData.baseUrl,
    };

    persistChanges(updated);
  };

  const handleApiKeyChange = (value: string) => {
    const trimmed = value.trim();
    let detectedProvider = formData.provider;
    let detectedModel = formData.model;

    // Auto-detect provider if user pasted a key with known prefix
    if (trimmed.startsWith('gsk_') && detectedProvider !== 'groq') {
      detectedProvider = 'groq';
      detectedModel = 'openai/gpt-oss-120b';
    } else if (trimmed.startsWith('sk-or-') && detectedProvider !== 'openrouter') {
      detectedProvider = 'openrouter';
      detectedModel = 'google/gemini-2.0-flash-exp:free';
    } else if ((trimmed.startsWith('AIza') || trimmed.startsWith('AQ.')) && detectedProvider !== 'gemini') {
      detectedProvider = 'gemini';
      detectedModel = 'gemini-3.5-flash-lite';
    }

    const updatedKeys = {
      ...(formData.apiKeys || {}),
      [detectedProvider]: trimmed,
    };

    const updated: AISettings = {
      ...formData,
      provider: detectedProvider,
      apiKey: trimmed,
      apiKeys: updatedKeys,
      model: detectedModel,
    };

    persistChanges(updated);
  };

  const handleYandexApiKeyChange = (value: string) => {
    const updated: AISettings = {
      ...formData,
      yandexApiKey: value,
    };
    persistChanges(updated);
  };

  const handleModelChange = (value: string) => {
    const updated: AISettings = {
      ...formData,
      model: value,
    };
    persistChanges(updated);
  };

  const handleBaseUrlChange = (value: string) => {
    persistChanges({ ...formData, baseUrl: value });
  };

  const handleThemeChange = (themeId: UITheme) => {
    if (formData.theme === themeId) return;

    const updated: AISettings = {
      ...formData,
      theme: themeId,
    };

    executeThemeTransition(() => {
      persistChanges(updated);
    });
  };

  const handleSave = () => {
    persistChanges(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 400);
  };

  const handleClearCache = () => {
    if (window.confirm('Очистить кэш всех сохраненных слов?')) {
      cacheService.clearCache();
      onCacheUpdated();
      setCacheClearMsg('Кэш успешно очищен!');
      setTimeout(() => setCacheClearMsg(''), 3000);
    }
  };

  const allThemesList: UITheme[] = ['language_explorer', 'prisma_noir'];

  const providersList: { id: AIProvider; label: string; desc: string; link: string; placeholder: string }[] = [
    { id: 'gemini', label: 'Google Gemini', desc: 'Flash-Lite • Free tier', link: 'aistudio.google.com/app/apikey', placeholder: 'AIzaSy...' },
    { id: 'groq', label: 'Groq Cloud', desc: 'GPT-OSS • Free plan', link: 'console.groq.com', placeholder: 'gsk_...' },
    { id: 'openrouter', label: 'OpenRouter', desc: 'Любые модели', link: 'openrouter.ai/keys', placeholder: 'sk-or-...' },
    { id: 'custom', label: 'Custom / Local', desc: 'Ollama / совместимый API', link: 'localhost:11434', placeholder: 'sk-...' },
  ];

  const hasCurrentKey = formData.apiKey && formData.apiKey.trim().length > 0;
  const configuredProvidersCount = Object.values(formData.apiKeys || {}).filter(k => k && k.trim().length > 0).length;
  const hasYandexKey = formData.yandexApiKey && formData.yandexApiKey.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
      />

      {/* Modal Surface */}
      <div className={`settings-modal-panel relative w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all z-10 ${currentThemeConfig.modalBg} ${currentThemeConfig.cardBorder}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-8 py-5 border-b ${currentThemeConfig.modalHeaderBg} ${currentThemeConfig.cardBorder}`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 ${
              currentThemeConfig.isLight ? 'bg-slate-900 text-white' : 'bg-white/[0.10] text-white border border-white/15'
            }`}>
              <Settings2 className="w-5 h-5" strokeWidth={1.7} />
            </div>
            <div>
              <h3 className={`text-xl font-extrabold tracking-tight ${currentThemeConfig.textPrimary}`}>
                Оформление & Настройки генерации и перевода
              </h3>
              <p className={`text-xs sm:text-sm mt-0.5 ${currentThemeConfig.textSecondary}`}>
                2 темы, модели генерации, Яндекс.Словарь и параметры тестирования
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              currentThemeConfig.isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto flex flex-col gap-8 flex-1">
          {/* Section 1: AI Provider & API Keys (Priority #1) */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${currentThemeConfig.textMuted}`}>
                <Cpu className={`w-4 h-4 ${currentThemeConfig.accentText}`} />
                Провайдеры & Генерация тестов (Gemini, Groq, OpenRouter)
              </label>

              <div className="flex items-center gap-2">
                {configuredProvidersCount > 0 ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    {configuredProvidersCount} из 4 настроены
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Ключи не введены
                  </span>
                )}
              </div>
            </div>

            {/* Provider Selector Cards with Live Key Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {providersList.map((p) => {
                const isSelected = formData.provider === p.id;
                const pKey = formData.apiKeys?.[p.id] || (formData.provider === p.id ? formData.apiKey : '') || '';
                const hasPKey = Boolean(pKey && pKey.trim().length > 0);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 active:scale-98 ${
                      isSelected
                        ? currentThemeConfig.isLight
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/15'
                          : 'bg-white/10 text-white border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg'
                        : currentThemeConfig.isLight
                        ? 'bg-white border-2 border-slate-200 text-slate-800 hover:border-slate-400 shadow-xs'
                        : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black">{p.label}</span>
                        {hasPKey ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shrink-0" title="Ключ сохранён" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-400/40 shrink-0" title="Не задан" />
                        )}
                      </div>
                      <div className="text-[11px] opacity-75 mt-0.5">{p.desc}</div>
                    </div>

                    <div className="text-[10px] font-bold">
                      {hasPKey ? (
                        <span className={`flex items-center gap-1 ${isSelected ? 'text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                          {pKey.length > 8 ? `${pKey.slice(0, 4)}...${pKey.slice(-4)}` : 'Сохранён'}
                        </span>
                      ) : (
                        <span className={isSelected ? 'text-slate-400' : 'text-slate-400/80'}>
                          Не заполнен
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Provider API Key Input with instant auto-save */}
            <div className="flex flex-col gap-2 p-5 rounded-2xl border bg-black/5 dark:bg-white/[0.03] border-current/10">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${currentThemeConfig.textPrimary}`}>
                  <Key className="w-4 h-4 text-amber-500" />
                  API-ключ для {formData.provider.toUpperCase()}{formData.provider === 'custom' ? ' (необязательно для локального сервера)' : ''}
                </label>
                <span className={`text-[11px] ${currentThemeConfig.textSecondary}`}>
                  Получить ключ: <a href={`https://${providersList.find(p => p.id === formData.provider)?.link}`} target="_blank" rel="noreferrer" className="underline font-bold text-sky-500 hover:text-sky-400">страница провайдера</a>
                </span>
              </div>

              <div className="relative mt-1">
                <input
                  ref={apiKeyInputRef}
                  type="text"
                  name={`vocabmaster-${formData.provider}-api-token`}
                  autoComplete="one-time-code"
                  data-form-type="other"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={formData.apiKey}
                  onPointerDown={() => { apiKeyInteractedRef.current = true; }}
                  onKeyDown={() => { apiKeyInteractedRef.current = true; }}
                  onPaste={() => { apiKeyInteractedRef.current = true; }}
                  onChange={(e) => {
                    if (!apiKeyInteractedRef.current) {
                      e.currentTarget.value = expectedApiKeyRef.current;
                      return;
                    }
                    handleApiKeyChange(e.target.value);
                  }}
                  placeholder={providersList.find(p => p.id === formData.provider)?.placeholder || 'Введите ваш API ключ...'}
                  style={{ WebkitTextSecurity: showKey ? 'none' : 'disc' } as React.CSSProperties}
                  className={`w-full pl-4 pr-12 py-3.5 rounded-xl ${currentThemeConfig.inputBg} ${currentThemeConfig.cardBorder} ${currentThemeConfig.inputText} ${currentThemeConfig.inputPlaceholder} text-sm focus:outline-none ${currentThemeConfig.inputFocus} transition-all shadow-inner font-mono`}
                />

                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md cursor-pointer transition-colors ${
                    currentThemeConfig.isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                  title={showKey ? 'Скрыть ключ' : 'Показать ключ'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className={currentThemeConfig.textMuted}>
                  ✓ Ключ сохраняется автоматически на ваш диск и в браузер при вводе
                </span>
                {hasCurrentKey && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    {formData.apiKey.length} символов сохранено
                  </span>
                )}
              </div>
            </div>

            {/* Model Selector: Visual Preset Cards + Custom Input */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${currentThemeConfig.textPrimary}`}>
                  <Sliders className="w-4 h-4 text-cyan-500" />
                  Модель нейросети ({formData.provider.toUpperCase()})
                </label>
                <span className={`text-[11px] font-mono font-bold ${currentThemeConfig.accentText}`}>
                  Выбрано: {formData.model}
                </span>
              </div>

              {/* Quick Model Selector Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(() => {
                  const modelPresets: Record<AIProvider, { id: string; name: string; tag: string; desc: string }[]> = {
                    groq: [
                      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', tag: 'Рекомендуется', desc: 'Максимальное качество на бесплатном плане Groq' },
                      { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', tag: 'Мгновенно', desc: 'Высокая скорость и экономный лимит' },
                      { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', tag: 'Точная', desc: 'Актуальная быстрая модель для языковых задач' },
                    ],
                    gemini: [
                      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', tag: 'Рекомендуется', desc: 'Самая быстрая бесплатная модель для упражнений' },
                      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', tag: 'Качество', desc: 'Более глубокая, но может отвечать заметно дольше' },
                      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Баланс', desc: 'Стабильная модель прошлого поколения' },
                      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Стабильная', desc: 'Быстрая Flash от Google' },
                      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', tag: 'Без задержек', desc: 'Легковесная быстрая модель' },
                    ],
                    openrouter: [
                      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', tag: 'Free', desc: 'Бесплатный доступ к Gemini' },
                      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'LLaMA 3.3 70B (Free)', tag: 'Free', desc: 'Мощная открытая модель' },
                      { id: 'liquid/lfm-7b:free', name: 'Liquid LFM 7B (Free)', tag: 'Free', desc: 'Быстрый отклик' },
                    ],
                    custom: [
                      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tag: 'Совместимая', desc: 'Быстрая и умная модель' },
                      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', tag: 'Совместимая', desc: 'Классическая модель' },
                    ],
                  };

                  const currentPresets = modelPresets[formData.provider] || [];

                  return currentPresets.map((m) => {
                    const isModelActive = formData.model === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModelChange(m.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-98 ${
                          isModelActive
                            ? currentThemeConfig.isLight
                              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20 shadow-sm'
                              : 'bg-cyan-500/15 text-white border-cyan-400 ring-2 ring-cyan-400/30 shadow-md'
                            : currentThemeConfig.isLight
                            ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black truncate">{m.name}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                              isModelActive 
                                ? 'bg-white/20 text-white' 
                                : currentThemeConfig.isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-cyan-300'
                            }`}>
                              {m.tag}
                            </span>
                          </div>
                          <span className="text-[10px] opacity-70 truncate mt-0.5">{m.desc}</span>
                        </div>

                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isModelActive
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-xs'
                            : 'border-slate-400/40'
                        }`}>
                          {isModelActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Custom Model ID Override */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  name="vocabmaster-model-id"
                  autoComplete="off"
                  data-form-type="other"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  value={formData.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  placeholder="Или введите своё имя модели..."
                  className={`w-full px-3.5 py-2.5 rounded-xl ${currentThemeConfig.inputBg} ${currentThemeConfig.cardBorder} ${currentThemeConfig.inputText} ${currentThemeConfig.inputPlaceholder} text-xs focus:outline-none ${currentThemeConfig.inputFocus} transition-all shadow-inner font-mono`}
                />
              </div>

              {formData.provider === 'custom' && (
                <div className="flex flex-col gap-2 mt-2">
                  <label className={`text-[11px] font-black uppercase tracking-wider ${currentThemeConfig.textMuted}`}>
                    Совместимый Base URL
                  </label>
                  <input
                    type="text"
                    name="vocabmaster-provider-base-url"
                    autoComplete="off"
                    data-form-type="other"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-bwignore="true"
                    value={formData.baseUrl || 'http://localhost:11434/v1'}
                    onChange={(e) => handleBaseUrlChange(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className={`w-full px-3.5 py-2.5 rounded-xl ${currentThemeConfig.inputBg} ${currentThemeConfig.cardBorder} ${currentThemeConfig.inputText} ${currentThemeConfig.inputPlaceholder} text-xs focus:outline-none ${currentThemeConfig.inputFocus} transition-all shadow-inner font-mono`}
                  />
                  <span className={`text-[11px] ${currentThemeConfig.textSecondary}`}>
                    Для локального Ollama API-ключ можно оставить пустым.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Yandex Dictionary & Instant Translation Engine */}
          <div className="flex flex-col gap-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${currentThemeConfig.textMuted}`}>
                <Languages className={`w-4 h-4 ${currentThemeConfig.accentText}`} />
                Движок словаря & Яндекс.Переводчик
              </label>

              {hasYandexKey ? (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Яндекс.Словарь активен
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-current/10">
                  ⚡ Google GTX + База CEFR (Встроено)
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 p-5 rounded-2xl border bg-black/5 dark:bg-white/[0.03] border-current/10">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${currentThemeConfig.textPrimary}`}>
                  <Key className="w-4 h-4 text-amber-500" />
                  API-ключ Яндекс.Словаря (Yandex.Dictionary API)
                </label>
                <span className={`text-[11px] ${currentThemeConfig.textSecondary}`}>
                  Получить ключ: <a href="https://yandex.ru/dev/dictionary/" target="_blank" rel="noreferrer" className="underline font-bold text-sky-500 hover:text-sky-400">yandex.ru/dev/dictionary</a>
                </span>
              </div>

              <div className="relative mt-1">
                <input
                  ref={yandexKeyInputRef}
                  type="text"
                  name="vocabmaster-yandex-api-token"
                  autoComplete="one-time-code"
                  data-form-type="other"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={formData.yandexApiKey || ''}
                  onPointerDown={() => { yandexKeyInteractedRef.current = true; }}
                  onKeyDown={() => { yandexKeyInteractedRef.current = true; }}
                  onPaste={() => { yandexKeyInteractedRef.current = true; }}
                  onChange={(e) => {
                    if (!yandexKeyInteractedRef.current) {
                      e.currentTarget.value = expectedYandexKeyRef.current;
                      return;
                    }
                    handleYandexApiKeyChange(e.target.value);
                  }}
                  placeholder="dict.1.1.2024..."
                  style={{ WebkitTextSecurity: showYandexKey ? 'none' : 'disc' } as React.CSSProperties}
                  className={`w-full pl-4 pr-12 py-3 rounded-xl ${currentThemeConfig.inputBg} ${currentThemeConfig.cardBorder} ${currentThemeConfig.inputText} ${currentThemeConfig.inputPlaceholder} text-sm focus:outline-none ${currentThemeConfig.inputFocus} transition-all shadow-inner font-mono`}
                />

                <button
                  type="button"
                  onClick={() => setShowYandexKey(!showYandexKey)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md cursor-pointer transition-colors ${
                    currentThemeConfig.isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                  title={showYandexKey ? 'Скрыть ключ' : 'Показать ключ'}
                >
                  {showYandexKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className={`text-[11px] leading-relaxed mt-1 ${currentThemeConfig.textMuted}`}>
                💡 Приложение использует многоуровневый каскад: <strong>Яндекс.Словарь</strong> (при указании ключа) ➔ <strong>Google Translate GTX Client</strong> (высокоскоростной мгновенный перевод &lt;40мс без лимитов) ➔ <strong>База Oxford/Cambridge CEFR</strong>. Переводы отображаются мгновенно и никогда не зависают.
              </p>
            </div>
          </div>

          {/* Section 3: unified visual mode */}
          <div className="flex flex-col gap-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${currentThemeConfig.textMuted}`}>
                <Palette className={`w-4 h-4 ${currentThemeConfig.accentText}`} />
                Оформление приложения
              </label>
              <span className={`text-xs font-bold ${currentThemeConfig.accentText}`}>
                Активна: {currentThemeConfig.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {allThemesList.map((themeId) => {
                const t = THEMES[themeId];
                const isSelected = formData.theme === themeId;

                return (
                  <button
                    key={themeId}
                    type="button"
                    onClick={() => handleThemeChange(themeId)}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between gap-3 relative cursor-pointer group active:scale-98 ${
                      isSelected
                        ? currentThemeConfig.isLight
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                          : 'bg-white/10 text-white border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg'
                        : currentThemeConfig.isLight
                        ? 'bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                        isSelected
                          ? 'bg-white/20 text-white border-white/30'
                          : currentThemeConfig.isLight
                          ? 'bg-slate-100 text-slate-800 border-slate-200'
                          : 'bg-white/[0.06] text-slate-300 border-white/10'
                      }`}>
                        {t.badge}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className={`w-5 h-5 ${currentThemeConfig.isLight ? 'text-emerald-400' : 'text-cyan-400'}`} />
                      )}
                    </div>

                    <div>
                      <div className="text-base font-extrabold mb-0.5">{t.name}</div>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${isSelected ? 'opacity-85 text-slate-200' : currentThemeConfig.textSecondary}`}>
                        {t.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Test Automation & Speed */}
          <div className="flex flex-col gap-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${currentThemeConfig.textMuted}`}>
              <Sliders className={`w-4 h-4 ${currentThemeConfig.accentText}`} />
              Поведение во время теста
            </label>

            <div className="flex items-center justify-between p-4 rounded-2xl border bg-black/5 dark:bg-white/[0.03] border-current/10">
              <div>
                <div className={`text-sm font-bold ${currentThemeConfig.textPrimary}`}>Автопереход при правильном ответе</div>
                <div className={`text-xs ${currentThemeConfig.textSecondary}`}>Мгновенно переключать на следующее слово без нажатия Enter</div>
              </div>
              <input
                type="checkbox"
                checked={formData.autoAdvanceCorrect}
                onChange={(e) => {
                  const updated = { ...formData, autoAdvanceCorrect: e.target.checked };
                  persistChanges(updated);
                }}
                className="w-5 h-5 rounded cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Section 5: Cache Management */}
          <div className="flex items-center justify-between p-4.5 rounded-2xl border bg-black/5 dark:bg-white/[0.03] border-current/10">
            <div>
              <div className={`text-sm font-bold ${currentThemeConfig.textPrimary}`}>Кэш переводов и вариантов</div>
              <div className={`text-xs ${currentThemeConfig.textSecondary}`}>Содержит локально сохраненные переводы и дистракторы</div>
              {cacheClearMsg && (
                <div className="text-xs text-emerald-500 font-bold mt-1">{cacheClearMsg}</div>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearCache}
              className="px-4 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Очистить кэш</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-8 py-4.5 border-t flex items-center justify-between gap-4 ${currentThemeConfig.modalFooterBg} ${currentThemeConfig.cardBorder}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
              currentThemeConfig.isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Закрыть
          </button>

          <FlowButton
            onClick={handleSave}
            className={`rounded-2xl px-7 py-3 font-bold text-xs sm:text-sm shadow-xl transition-all ${currentThemeConfig.primaryButton}`}
            text={isSaved ? 'Сохранено ✓' : 'Сохранить настройки'}
          />
        </div>
      </div>
    </div>
  );
};
