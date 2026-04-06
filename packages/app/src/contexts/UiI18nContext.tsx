import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_UI_LOCALE, formatMessage, MESSAGES, type UiLocale } from "../i18n/messages";

export const UI_TRANSLATION_ENABLED_STORAGE_KEY = "calc-translation-ui-translation-enabled";

type UiI18nContextValue = {
  locale: UiLocale;
  uiTranslationEnabled: boolean;
  setUiTranslationEnabled: (enabled: boolean) => void;
  syncTranscriptLanguage: (languageCode: string | null | undefined) => void;
  canTranslateLanguage: (languageCode: string | null | undefined) => boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDateTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
};

const UiI18nContext = createContext<UiI18nContextValue | null>(null);

function isUiLocale(value: string | null | undefined): value is UiLocale {
  return value === "en" || value === "es" || value === "zh" || value === "id";
}

function resolveLocale(languageCode: string | null | undefined, enabled: boolean): UiLocale {
  if (!enabled) {
    return DEFAULT_UI_LOCALE;
  }

  return isUiLocale(languageCode) ? languageCode : DEFAULT_UI_LOCALE;
}

function readInitialUiTranslationEnabled() {
  const browser = globalThis as typeof globalThis & {
    localStorage?: {
      getItem?: (key: string) => string | null;
    };
  };

  return browser.localStorage?.getItem?.(UI_TRANSLATION_ENABLED_STORAGE_KEY) === "true";
}

type UiI18nProviderProps = {
  children: ReactNode;
};

export function UiI18nProvider({ children }: UiI18nProviderProps) {
  const [uiTranslationEnabled, setUiTranslationEnabled] = useState(readInitialUiTranslationEnabled);
  const [transcriptLanguage, setTranscriptLanguage] = useState<string | null>(null);

  const locale = useMemo(() => {
    return resolveLocale(transcriptLanguage, uiTranslationEnabled);
  }, [transcriptLanguage, uiTranslationEnabled]);

  useEffect(() => {
    const browser = globalThis as typeof globalThis & {
      localStorage?: {
        setItem?: (key: string, value: string) => void;
      };
      document?: {
        documentElement?: {
          lang?: string;
        };
      };
    };

    browser.localStorage?.setItem?.(
      UI_TRANSLATION_ENABLED_STORAGE_KEY,
      uiTranslationEnabled ? "true" : "false",
    );
    if (browser.document?.documentElement) {
      browser.document.documentElement.lang = locale;
    }
  }, [locale, uiTranslationEnabled]);

  const value = useMemo<UiI18nContextValue>(() => {
    const dictionary = MESSAGES[locale] || MESSAGES.en;

    return {
      locale,
      uiTranslationEnabled,
      setUiTranslationEnabled,
      syncTranscriptLanguage: (languageCode) => {
        setTranscriptLanguage(languageCode || null);
      },
      canTranslateLanguage: (languageCode) => isUiLocale(languageCode),
      t: (key, params = {}) => formatMessage(dictionary, key, params),
      formatDateTime: (value, options = {}) => {
        const date = value instanceof Date ? value : new Date(value);
        return new Intl.DateTimeFormat(locale, options).format(date);
      },
      formatTime: (value, options = {}) => {
        const date = value instanceof Date ? value : new Date(value);
        return new Intl.DateTimeFormat(locale, options).format(date);
      },
    };
  }, [locale, uiTranslationEnabled]);

  return <UiI18nContext.Provider value={value}>{children}</UiI18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(UiI18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside UiI18nProvider");
  }

  return value;
}
