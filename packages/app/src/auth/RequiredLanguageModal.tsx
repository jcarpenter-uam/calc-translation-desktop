import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../hooks/api";
import { getLanguageLabel } from "../languages/LanguageList";
import {
  LANGUAGE_STORAGE_KEY,
  LanguageSelect,
  readInitialLanguage,
} from "../settings/LanguageSelect";

type RequiredLanguageModalProps = {
  isOpen: boolean;
};

/**
 * Blocks the authenticated shell until a first-time user saves a language preference.
 */
export function RequiredLanguageModal({ isOpen }: RequiredLanguageModalProps) {
  const { user, updateLanguagePreference } = useAuth();
  const [language, setLanguage] = useState<string>(readInitialLanguage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextLanguage = user?.languageCode || readInitialLanguage();
    setLanguage(nextLanguage);
    setErrorMessage(null);
  }, [isOpen, user?.languageCode]);

  if (!isOpen) {
    return null;
  }

  const browser = globalThis as typeof globalThis & {
    document?: {
      body?: Element | DocumentFragment;
    };
    localStorage?: {
      setItem?: (key: string, value: string) => void;
    };
  };
  const portalTarget = browser.document?.body;

  const onConfirm = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await updateLanguagePreference(language);
      browser.localStorage?.setItem?.(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "We could not save your language right now. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[85] overflow-y-auto bg-ink/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="required-language-title"
      aria-describedby="required-language-description"
    >
      <div className="mx-auto flex min-h-full w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-line/80 bg-panel/95 p-6 shadow-panel sm:p-8">
          <div className="space-y-3">
            <div className="space-y-2">
              <h2
                id="required-language-title"
                className="text-2xl font-semibold text-ink"
              >
                Choose your language
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-line bg-canvas p-4 text-sm leading-6 text-ink-muted">
              <p className="font-semibold text-ink">What this means</p>
              <p className="mt-2">
                We will use{" "}
                <span className="font-semibold text-ink">
                  {getLanguageLabel(language)}
                </span>{" "}
                as your default translated view in live meetings and related
                transcripts.
              </p>
              <p className="mt-2">
                This does not lock the whole room to one language. It only sets
                your personal default and you can always change it later.
              </p>
            </div>

            <LanguageSelect value={language} onChange={setLanguage} />

            {errorMessage ? (
              <div
                className="rounded-2xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-100"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                void onConfirm();
              }}
              disabled={isSaving}
              className="rounded-xl border border-lime/50 bg-lime/10 px-4 py-2 text-sm font-semibold text-lime transition hover:border-lime hover:bg-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save language"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!portalTarget) {
    return dialog;
  }

  return createPortal(dialog, portalTarget);
}
