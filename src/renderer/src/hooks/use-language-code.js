import { useCallback } from "react";
import { useAuth } from "../context/auth";
import { useLanguage } from "../context/language";

export function useLanguageCode() {
  const { user, setUser } = useAuth();
  const { uiLanguage, setUiLanguage, targetLanguage, setTargetLanguage } =
    useLanguage();

  const setLanguageCode = useCallback(
    async (newLang) => {
      setTargetLanguage(newLang);

      if (user) {
        setUser({ ...user, language_code: newLang });
        try {
          if (window.electron?.updateUserLanguage) {
            await window.electron.updateUserLanguage(newLang);
          }
        } catch (err) {
          console.error("Failed to sync language preference:", err);
        }
      }
    },
    [user, setUser, setTargetLanguage],
  );

  return {
    languageCode: user?.language_code || "en",
    setLanguageCode,
    uiLanguage,
    setUiLanguage,
    targetLanguage,
    setTargetLanguage,
  };
}
