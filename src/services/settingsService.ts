import type { AISettings, TestMode, AIProvider, CEFRLevel } from '../types';

const SETTINGS_KEY = 'vocabmaster_ai_settings';
const SESSION_STATE_KEY = 'vocabmaster_session_state';
const GEMINI_37_MIGRATION_KEY = 'vocabmaster_gemini_37_migration_v1';
const GEMINI_FLASH_LITE_MIGRATION_KEY = 'vocabmaster_gemini_flash_lite_migration_v1';
let settingsRevision = 0;

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '',
  apiKeys: {
    gemini: '',
    groq: '',
    openrouter: '',
    custom: '',
  },
  yandexApiKey: '',
  model: 'gemini-3.5-flash-lite',
  baseUrl: 'http://localhost:11434/v1',
  theme: 'cyber_oasis',
  soundEnabled: true,
  autoAdvanceCorrect: true,
  autoAdvanceDelayMs: 450,
};

export interface SessionState {
  inputText: string;
  mode: TestMode;
  numOptions: number;
  sourceType: 'vocab_bank' | 'custom_input';
  bankLevel: CEFRLevel | 'all';
  bankWordCount: number;
}

const DEFAULT_SESSION_STATE: SessionState = {
  inputText: '',
  mode: 'mode1_choice',
  numOptions: 4,
  sourceType: 'vocab_bank',
  bankLevel: 'all',
  bankWordCount: 15,
};

export const settingsService = {
  getSettings(): AISettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      let parsed: Partial<AISettings> = {};

      if (stored) {
        try {
          parsed = JSON.parse(stored);
        } catch {
          // ignore
        }
      }

      // Auto-detect & fix misrouted keys (e.g. Groq key gsk_ accidentally saved in gemini slot)
      let keyGemini =
        parsed.apiKeys?.gemini ||
        (parsed.provider === 'gemini' ? parsed.apiKey : '') ||
        localStorage.getItem('vocabmaster_key_gemini') ||
        localStorage.getItem('gemini_api_key') ||
        '';

      let keyGroq =
        parsed.apiKeys?.groq ||
        (parsed.provider === 'groq' ? parsed.apiKey : '') ||
        localStorage.getItem('vocabmaster_key_groq') ||
        localStorage.getItem('groq_api_key') ||
        '';

      let keyOpenRouter =
        parsed.apiKeys?.openrouter ||
        (parsed.provider === 'openrouter' ? parsed.apiKey : '') ||
        localStorage.getItem('vocabmaster_key_openrouter') ||
        '';

      let keyCustom =
        parsed.apiKeys?.custom ||
        (parsed.provider === 'custom' ? parsed.apiKey : '') ||
        localStorage.getItem('vocabmaster_key_custom') ||
        '';

      // Fix misplaced keys automatically
      if (keyGemini.startsWith('gsk_')) {
        if (!keyGroq) keyGroq = keyGemini;
        keyGemini = '';
      }
      if (keyGemini.startsWith('sk-or-')) {
        if (!keyOpenRouter) keyOpenRouter = keyGemini;
        keyGemini = '';
      }

      const yandexApiKey =
        parsed.yandexApiKey ||
        localStorage.getItem('yandex_dict_api_key') ||
        localStorage.getItem('vocabmaster_key_yandex') ||
        '';

      const apiKeys: Record<AIProvider, string> = {
        gemini: keyGemini,
        groq: keyGroq,
        openrouter: keyOpenRouter,
        custom: keyCustom,
      };

      // Determine active provider: STRICTLY respect user's choice!
      let provider: AIProvider = parsed.provider || DEFAULT_SETTINGS.provider;

      // If user had gsk_ key in gemini slot, fix active provider to groq
      if (provider === 'gemini' && parsed.apiKey?.startsWith('gsk_')) {
        provider = 'groq';
      }

      const currentApiKey = apiKeys[provider] || '';
      let model = parsed.model || DEFAULT_SETTINGS.model;
      const geminiMigrationDone = localStorage.getItem(GEMINI_37_MIGRATION_KEY) === '1';
      if (provider === 'gemini' && parsed.model === 'gemini-3.5-flash' && !geminiMigrationDone) {
        model = DEFAULT_SETTINGS.model;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...parsed, model }));
      }
      if (provider === 'gemini') localStorage.setItem(GEMINI_37_MIGRATION_KEY, '1');
      // Move the former default 3.7 Flash to the latency-oriented Flash-Lite once.
      // A later explicit user choice is preserved by this marker.
      const flashLiteMigrationDone = localStorage.getItem(GEMINI_FLASH_LITE_MIGRATION_KEY) === '1';
      if (provider === 'gemini' && model === 'gemini-3.7-flash' && !flashLiteMigrationDone) {
        model = DEFAULT_SETTINGS.model;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...parsed, model }));
      }
      if (provider === 'gemini') localStorage.setItem(GEMINI_FLASH_LITE_MIGRATION_KEY, '1');
      if (provider === 'groq' && ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'].includes(model)) {
        model = 'openai/gpt-oss-120b';
      }

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        provider,
        model,
        apiKey: currentApiKey,
        apiKeys,
        yandexApiKey,
      };
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: AISettings): void {
    try {
      settingsRevision += 1;
      const apiKeys = {
        gemini: settings.apiKeys?.gemini || (settings.provider === 'gemini' ? settings.apiKey : '') || '',
        groq: settings.apiKeys?.groq || (settings.provider === 'groq' ? settings.apiKey : '') || '',
        openrouter: settings.apiKeys?.openrouter || (settings.provider === 'openrouter' ? settings.apiKey : '') || '',
        custom: settings.apiKeys?.custom || (settings.provider === 'custom' ? settings.apiKey : '') || '',
      };

      // Auto-route gsk_ to groq slot
      if (apiKeys.gemini.startsWith('gsk_')) {
        if (!apiKeys.groq) apiKeys.groq = apiKeys.gemini;
        apiKeys.gemini = '';
      }

      // Ensure the active provider's key is synced
      if (settings.apiKey) {
        apiKeys[settings.provider] = settings.apiKey;
      }

      const toSave: AISettings = {
        ...settings,
        apiKey: apiKeys[settings.provider] || '',
        apiKeys,
        yandexApiKey: settings.yandexApiKey || '',
      };

      // 1. Primary localStorage key
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));

      // 2. Redundant individual localStorage keys
      const persistOrRemove = (keys: string[], value: string) => {
        for (const key of keys) {
          if (value) localStorage.setItem(key, value);
          else localStorage.removeItem(key);
        }
      };
      persistOrRemove(['vocabmaster_key_gemini', 'gemini_api_key'], apiKeys.gemini);
      persistOrRemove(['vocabmaster_key_groq', 'groq_api_key'], apiKeys.groq);
      persistOrRemove(['vocabmaster_key_openrouter'], apiKeys.openrouter);
      persistOrRemove(['vocabmaster_key_custom'], apiKeys.custom);
      persistOrRemove(['yandex_dict_api_key', 'vocabmaster_key_yandex'], settings.yandexApiKey || '');

      // 3. Permanent Disk persistence via Electron IPC (immune to browser port changes / cache clear)
      if (window.electronAPI?.saveSettingsDisk) {
        window.electronAPI.saveSettingsDisk(toSave);
      }
    } catch {
      // Ignore write error
    }
  },

  async syncWithDisk(): Promise<AISettings | null> {
    try {
      if (window.electronAPI?.getSettingsDisk) {
        const revisionAtStart = settingsRevision;
        const diskSettings = await window.electronAPI.getSettingsDisk();
        if (settingsRevision !== revisionAtStart) return null;
        if (diskSettings) {
          const current = this.getSettings();
          // Merge disk settings with local settings (disk takes precedence for non-empty keys)
          const merged: AISettings = {
            ...current,
            ...diskSettings,
            apiKeys: {
              gemini: diskSettings.apiKeys?.gemini || current.apiKeys?.gemini || '',
              groq: diskSettings.apiKeys?.groq || current.apiKeys?.groq || '',
              openrouter: diskSettings.apiKeys?.openrouter || current.apiKeys?.openrouter || '',
              custom: diskSettings.apiKeys?.custom || current.apiKeys?.custom || '',
            },
            yandexApiKey: diskSettings.yandexApiKey || current.yandexApiKey || '',
          };
          this.saveSettings(merged);
          return merged;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  },

  getSessionState(): SessionState {
    try {
      const stored = localStorage.getItem(SESSION_STATE_KEY);
      if (stored) {
        return { ...DEFAULT_SESSION_STATE, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore JSON parse error
    }
    return DEFAULT_SESSION_STATE;
  },

  saveSessionState(state: Partial<SessionState>): void {
    try {
      const current = this.getSessionState();
      localStorage.setItem(SESSION_STATE_KEY, JSON.stringify({ ...current, ...state }));
    } catch {
      // Ignore write error
    }
  },
};
