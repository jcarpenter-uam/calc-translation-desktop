import { useEffect, useCallback } from "react";
import { useAuth } from "../context/auth";
import { useLanguage } from "../context/language";

export function useLanguageCode() {
  const { user, setUser } = useAuth();
  const { language, setLanguage: setLocalLanguage } = useLanguage();

  useEffect(() => {
    if (user?.language_code && user.language_code !== language) {
      setLocalLanguage(user.language_code);
    }
  }, [user]);

  const setLanguage = useCallback(
    async (newLang) => {
      setLocalLanguage(newLang);

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
    [user, setUser, setLocalLanguage],
  );

  return { language, setLanguage };
}
