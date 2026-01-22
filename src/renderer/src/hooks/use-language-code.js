import { useCallback } from "react";
import { useAuth } from "../context/auth";
import { useLanguage } from "../context/language";

export function useLanguageCode() {
  const { user, setUser } = useAuth();
  const { language: uiLanguage, setLanguage: setUiLanguage } = useLanguage();

  const setLanguageCode = useCallback(
    async (newLang) => {
      if (user) {
        setUser({ ...user, language_code: newLang });

        try {
          if (window.electron && window.electron.updateUserLanguage) {
            const result = await window.electron.updateUserLanguage(newLang);

            if (result.status === "error") {
              console.error("IPC Error updating language:", result.message);
            }
          } else {
            console.warn(
              "Electron IPC not available. Language not synced to server.",
            );
          }
        } catch (err) {
          console.error("Failed to sync language preference:", err);
        }
      }
    },
    [user, setUser],
  );

  return {
    languageCode: user?.language_code || "en",
    setLanguageCode,
    uiLanguage,
    setUiLanguage,
  };
}
