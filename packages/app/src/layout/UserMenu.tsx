import { useEffect, useMemo, useRef, useState } from "react";
import { FaCog } from "react-icons/fa";
import { useAuth } from "../auth/AuthContext";
import { ReportBugModal } from "../bugReports/ReportBugModal";
import {
  LANGUAGE_STORAGE_KEY,
  readInitialLanguage,
} from "../settings/LanguageSelect";
import { SettingsModal } from "../settings/SettingsModal";

export function UserMenu() {
  const { status, user, logoutAndReset, updateLanguagePreference } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportBugOpen, setIsReportBugOpen] = useState(false);
  const [language, setLanguage] = useState<string>(readInitialLanguage);
  const menuRef = useRef<any>(null);

  const isAuthenticated = status === "authenticated";
  const displayUser = useMemo(
    () => user?.name || user?.email || "Unknown user",
    [user?.email, user?.name],
  );

  useEffect(() => {
    const browser = globalThis as any;

    const onPointerDown = (event: any) => {
      if (!menuRef.current?.contains?.(event?.target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: any) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsSettingsOpen(false);
        setIsReportBugOpen(false);
      }
    };

    browser?.document?.addEventListener?.("mousedown", onPointerDown);
    browser?.document?.addEventListener?.("keydown", onKeyDown);

    return () => {
      browser?.document?.removeEventListener?.("mousedown", onPointerDown);
      browser?.document?.removeEventListener?.("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const browser = globalThis as any;
    browser?.localStorage?.setItem?.(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (user?.languageCode) {
      setLanguage(user.languageCode);
    }
  }, [user?.languageCode]);

  const onLanguageChange = async (nextLanguage: string) => {
    setLanguage(nextLanguage);

    try {
      await updateLanguagePreference(nextLanguage);
    } catch {
      if (user?.languageCode) {
        setLanguage(user.languageCode);
      }
    }
  };

  const onMenuKeyDown = (event: any) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setIsSettingsOpen(false);
      setIsReportBugOpen(false);
    }
  };

  return (
    <>
      <div ref={menuRef} className="relative" onKeyDown={onMenuKeyDown}>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel/90 text-ink shadow-panel transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Open user menu"
        >
          <FaCog
            className={`h-4 w-4 transition-transform duration-200 ease-out ${
              isOpen ? "rotate-90" : "rotate-0"
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen ? (
          <div
            className="absolute left-0 mt-2 w-72 rounded-2xl border border-line bg-panel/95 p-3 shadow-panel backdrop-blur-sm"
            role="menu"
            aria-label="User menu"
          >
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(true);
                setIsOpen(false);
              }}
              className="mb-3 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-left text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
              role="menuitem"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setIsReportBugOpen(true);
                setIsOpen(false);
              }}
              className="mb-3 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-left text-sm font-semibold text-ink transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
              role="menuitem"
            >
              Report Bug
            </button>

            {isAuthenticated ? (
              <div className="mb-3 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-muted">
                <p>
                  Logged in as{" "}
                  <span className="font-semibold text-ink">{displayUser}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void logoutAndReset();
                    setIsOpen(false);
                  }}
                  className="mt-2 text-sm font-semibold text-accent transition hover:text-accent-hover focus:outline-none"
                >
                  Logout?
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        language={language}
        onClose={() => setIsSettingsOpen(false)}
        onLanguageChange={(value) => {
          void onLanguageChange(value);
        }}
      />
      <ReportBugModal
        isOpen={isReportBugOpen}
        onClose={() => setIsReportBugOpen(false)}
      />
    </>
  );
}
