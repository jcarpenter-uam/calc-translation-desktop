import React, { createContext, useState, useContext, useEffect } from "react";
import log from "electron-log/renderer";
import { useTranslation } from "react-i18next";

const LanguageContext = createContext();

const STORAGE_KEY_UI = "app-ui-language";
const STORAGE_KEY_TARGET = "app-target-language";

/**
 * Context for per user storage of preffered language with 3 steps for selecting the default.
 * 1. Check for a saved value in localStorage (from previous use)
 * 2. If no saved value, check the browser's language
 * 3. Fallback to English
 */
function getInitialLanguage(storageKey) {
  try {
    const storedLanguage = window.localStorage.getItem(storageKey);
    if (storedLanguage) {
      log.info(
        `Language: Found saved ${storageKey} in localStorage: ${storedLanguage}`,
      );
      return storedLanguage;
    }
  } catch (error) {
    log.error(`Language: Error reading ${storageKey} from localStorage`, error);
  }

  const browserLang = window.navigator.language;
  if (browserLang.startsWith("zh")) return "zh";
  if (browserLang.startsWith("es")) return "es";
  return "en";
}

export function LanguageProvider({ children }) {
  const [uiLanguage, setUiLanguageState] = useState(() =>
    getInitialLanguage(STORAGE_KEY_UI),
  );
  const [targetLanguage, setTargetLanguageState] = useState(() =>
    getInitialLanguage(STORAGE_KEY_TARGET),
  );
  const { i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(uiLanguage);
  }, [uiLanguage, i18n]);

  const setUiLanguage = (newLang) => {
    setUiLanguageState(newLang);
    try {
      window.localStorage.setItem(STORAGE_KEY_UI, newLang);
    } catch (error) {
      log.error("Language: Error writing uiLanguage to localStorage", error);
    }
  };

  const setTargetLanguage = (newLang) => {
    setTargetLanguageState(newLang);
    try {
      window.localStorage.setItem(STORAGE_KEY_TARGET, newLang);
    } catch (error) {
      log.error(
        "Language: Error writing targetLanguage to localStorage",
        error,
      );
    }
  };

  return (
    <LanguageContext.Provider
      value={{ uiLanguage, setUiLanguage, targetLanguage, setTargetLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
